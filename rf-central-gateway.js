 'use strict';
// Only the gateway (port 18828), NEVER ae-auto-server (18827), may face a tunnel.
const http=require('http'), fs=require('fs'), path=require('path'), crypto=require('crypto'), os=require('os');
const PORT=18828, ENGINE=18827, MAX_BYTES=1024*1024*1024;
const secretPath=path.join(__dirname,'.rf-central-secret');
let SECRET=process.env.RF_TAG_SIGNING_KEY||'';
if(!SECRET&&fs.existsSync(secretPath))SECRET=fs.readFileSync(secretPath,'utf8').trim();
if(SECRET.length<32){console.error('Missing gateway signing key. Run Setup-Central-Engine.cmd first.');process.exit(1)}
const origins=new Set(['https://rushfinder.vercel.app','http://127.0.0.1:18827','http://localhost:18827']);
function bad(res,status,msg){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:msg}))}
function verify(header){
 const token=(header||'').replace(/^Bearer\s+/i,''); const parts=token.split('.'); if(parts.length!==2)return false;
 const mac=crypto.createHmac('sha256',SECRET).update(parts[0]).digest();
 let sig;try{sig=Buffer.from(parts[1],'base64url')}catch{return false}
 if(sig.length!==mac.length||!crypto.timingSafeEqual(mac,sig))return false;
 let p;try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'))}catch{return false}
 return p&&p.scope==='tag-render'&&p.exp>Date.now()&&p.exp<Date.now()+2*60*60*1000;
}
let activeUploads=0;
const chunks=new Map();
const allowedCreate=new Set(['/ae-api/create','/ae-api/channel-create','/ae-api/role-create','/ae-api/mashhad-create']);
function deleteChunk(id){const job=chunks.get(id);if(job){chunks.delete(id);try{fs.unlinkSync(job.file)}catch(_){}}}
setInterval(()=>{for(const [id,job] of chunks)if(Date.now()-job.time>60*60*1000)deleteChunk(id)},10*60*1000).unref();
function bodyJson(req,limit=8192){return new Promise((resolve,reject)=>{
 let chunks=[],n=0;req.on('data',b=>{n+=b.length;if(n>limit){reject(Error('Request too large'));req.destroy()}else chunks.push(b)});
 req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch(e){reject(e)}});req.on('error',reject);
})}
function forwardSavedFile(job,res){
 if(activeUploads>=2){job.busy=false;return bad(res,429,'Render queue busy')}activeUploads++;
 const done=()=>{if(activeUploads>0)activeUploads--;deleteChunk(job.id)};
 const forward=http.request({hostname:'127.0.0.1',port:ENGINE,method:'POST',path:job.target,headers:{'Host':'127.0.0.1:18827','Content-Type':'application/octet-stream','Content-Length':job.bytes},timeout:15*60*1000},up=>{
   const payload=[];up.on('data',b=>payload.push(b));up.on('end',()=>{done();res.writeHead(up.statusCode||502,{'Content-Type':'application/json; charset=utf-8'});res.end(Buffer.concat(payload))});
 });
 forward.on('error',()=>{done();if(!res.headersSent)bad(res,502,'Render engine unavailable')});
 forward.on('timeout',()=>forward.destroy(new Error('Render engine timeout')));
 fs.createReadStream(job.file).on('error',e=>forward.destroy(e)).pipe(forward);
}
http.createServer((req,res)=>{
 const origin=req.headers.origin;
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(origin){if(!origins.has(origin))return bad(res,403,'Origin not permitted');res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type,Range');res.setHeader('Access-Control-Expose-Headers','Content-Length,Content-Range,Accept-Ranges,Content-Type');
 const url=new URL(req.url,'http://localhost');
 const pathname=url.pathname;
 const chunkRoute=['/rf-upload/init','/rf-upload/part','/rf-upload/finish'].includes(pathname);
 if(chunkRoute){
   if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
   if(req.method!=='POST')return bad(res,405,'Method not allowed');
   if(!verify(req.headers.authorization))return bad(res,401,'Session missing or expired');
   if(pathname==='/rf-upload/init'){
     bodyJson(req).then(data=>{
       if(typeof data.target!=='string'||data.target.length>1800)return bad(res,400,'Invalid target');
       const target=new URL(data.target,'http://localhost');
       if(!allowedCreate.has(target.pathname)||!data.target.startsWith(target.pathname))return bad(res,400,'Invalid route');
       const size=Number(data.size);
       if(!Number.isSafeInteger(size)||size<1||size>MAX_BYTES)return bad(res,413,'Video exceeds 1GB');
       if(chunks.size>=12)return bad(res,429,'Too many pending uploads');
       const id=crypto.randomUUID(),file=path.join(os.tmpdir(),'rf-central-'+id+'.bin');
       fs.writeFileSync(file,'',{flag:'wx'});chunks.set(id,{id,file,target:data.target,bytes:0,expected:size,next:0,busy:false,time:Date.now()});
       res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id,chunkSize:16*1024*1024}));
     }).catch(()=>bad(res,400,'Invalid request'));
     return;
   }
   const id=url.searchParams.get('id'),job=chunks.get(id);
   if(!job)return bad(res,404,'Upload not found or expired');
   if(job.busy)return bad(res,409,'Upload part already in progress');
   if(pathname==='/rf-upload/part'){
      const seq=Number(url.searchParams.get('seq'));
      const length=Number(req.headers['content-length']);
      if(!Number.isSafeInteger(seq)||seq!==job.next||!Number.isSafeInteger(length)||length<1||length>16*1024*1024||job.bytes+length>job.expected)return bad(res,400,'Invalid upload chunk');
      job.busy=true;let received=0;
      const sink=fs.createWriteStream(job.file,{flags:'a'});
      req.on('data',b=>{received+=b.length;if(received>length){req.destroy();sink.destroy()}});
      req.on('aborted',()=>{job.busy=false;deleteChunk(id);sink.destroy()});
      sink.on('error',()=>{job.busy=false;deleteChunk(id);if(!res.writableEnded)bad(res,500,'Upload write failed')});
      sink.on('finish',()=>{
       job.busy=false;if(received!==length){deleteChunk(id);return bad(res,400,'Incomplete chunk')}
       job.bytes+=received;job.next++;job.time=Date.now();res.setHeader('Content-Type','application/json');res.end(JSON.stringify({received:job.bytes}));
      });req.pipe(sink);return;
   }
   if(job.bytes!==job.expected)return bad(res,400,'Upload incomplete');
   job.busy=true;forwardSavedFile(job,res);return;
 }
 const valid=(req.method==='GET' && (pathname==='/ae-api/check'||pathname==='/ae-api/status'||/^\/ae-output\/[a-f0-9-]{36}\.mp4$/.test(pathname))) ||
   (req.method==='POST'&&['/ae-api/create','/ae-api/channel-create','/ae-api/role-create','/ae-api/mashhad-create'].includes(pathname));
 if(!valid){if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}return bad(res,404,'Route unavailable')}
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
 if(!verify(req.headers.authorization))return bad(res,401,'Session missing or expired');
 if(req.method==='POST'){
   const size=Number(req.headers['content-length']||0);
   if(size>MAX_BYTES)return bad(res,413,'Video exceeds 1GB');
   if(activeUploads>=2)return bad(res,429,'Render queue is busy. Try again soon.');
   activeUploads++;
 }
 const headers={'Host':'127.0.0.1:18827'};
 if(req.headers['content-type'])headers['Content-Type']=req.headers['content-type'];
 if(req.headers['content-length'])headers['Content-Length']=req.headers['content-length'];
 if(req.headers.range)headers['Range']=req.headers.range;
 // No Origin is forwarded: local engine already restricts its own direct browser requests.
 let counted=0,closed=false;
 const finish=()=>{if(!closed){closed=true;if(req.method==='POST')activeUploads--}};
 const proxy=http.request({hostname:'127.0.0.1',port:ENGINE,method:req.method,path:url.pathname+url.search,headers,timeout:15*60*1000},up=>{
   if(res.writableEnded){up.resume();return}
   const safe={};for(const k of ['content-type','content-length','content-range','accept-ranges'])if(up.headers[k])safe[k]=up.headers[k];
   res.writeHead(up.statusCode||502,safe);up.pipe(res);up.on('end',finish);
 });
 proxy.on('error',()=>{finish();if(!res.headersSent)bad(res,502,'Local engine unavailable');else res.destroy()});
 proxy.on('timeout',()=>proxy.destroy(new Error('Engine timeout')));
 req.on('data',b=>{counted+=b.length;if(counted>MAX_BYTES)proxy.destroy(new Error('Upload too large'))});
 req.on('aborted',()=>{finish();proxy.destroy()});res.on('close',finish);
 req.pipe(proxy);
}).listen(PORT,'127.0.0.1',()=>console.log('SECURE Central Gateway ready: http://127.0.0.1:'+PORT+' (no public access without signed ticket)'));
