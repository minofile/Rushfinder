'use strict';
// RushFinder LAN archive: read-only, no dependencies, no external uploads.
const http=require('node:http'),fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const ROOT=path.resolve(process.env.RUSH_ROOT || String.raw`\\192.168.40.13\Mashhad News\RushFinder`);
const PORT=Number(process.env.RUSH_PORT||8787);
const EXT=new Set(['.mp4','.mov','.m4v','.webm','.avi','.mkv','.wmv','.mpeg','.mpg']);
const MIME={'.mp4':'video/mp4','.m4v':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.avi':'video/x-msvideo','.mkv':'video/x-matroska','.wmv':'video/x-ms-wmv','.mpeg':'video/mpeg','.mpg':'video/mpeg'};
// Private archive security. First launch creates a persistent random secret in this folder.
const SECRET_FILE=path.join(__dirname,'.rushfinder-secret');
let API_KEY=process.env.RUSH_ARCHIVE_KEY;
if(!API_KEY){try{API_KEY=fs.readFileSync(SECRET_FILE,'utf8').trim()}catch{API_KEY=crypto.randomBytes(32).toString('hex');fs.writeFileSync(SECRET_FILE,API_KEY,{mode:0o600})}}
if(API_KEY.length<32)throw Error('RUSH_ARCHIVE_KEY must be at least 32 characters');
const CORS_ORIGIN='https://rushfinder.vercel.app';
const safeEq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const authorized=req=>safeEq(req.headers['x-rush-key']||'',API_KEY);
const sign=(id,exp,download)=>crypto.createHmac('sha256',API_KEY).update(id+'|'+exp+'|'+download).digest('hex');
const allowedSigned=(u)=>{const id=u.searchParams.get('id')||'',exp=Number(u.searchParams.get('exp')),dl=u.searchParams.has('download')?'1':'0';return Number.isSafeInteger(exp)&&exp>=Math.floor(Date.now()/1000)&&exp<=Math.floor(Date.now()/1000)+3600&&safeEq(u.searchParams.get('sig')||'',sign(id,exp,dl))};
const signedUrl=(id,dl)=>{const exp=Math.floor(Date.now()/1000)+900;return '/video?id='+encodeURIComponent(id)+(dl?'&download=1':'')+'&exp='+exp+'&sig='+sign(id,exp,dl?'1':'0')};
let files=[],lastScan=0,scanError='',scanning=null;
const isSub=(p)=>p===ROOT||p.startsWith(ROOT+path.sep);
async function scan(){if(scanning)return scanning;scanning=(async()=>{
  const found=[]; const seen=new Set();
  async function walk(dir,depth){if(depth>7||found.length>=20000)return;let entries;try{entries=await fsp.readdir(dir,{withFileTypes:true})}catch(e){if(dir===ROOT)throw e;return}
    for(const e of entries){if(e.name.startsWith('.')||e.name.startsWith('~$'))continue;const full=path.join(dir,e.name);if(e.isSymbolicLink())continue;
      if(e.isDirectory()){await walk(full,depth+1);continue}
      if(!e.isFile()||!EXT.has(path.extname(e.name).toLowerCase()))continue;
      const rel=path.relative(ROOT,full);if(seen.has(rel))continue;seen.add(rel);
      try{const st=await fsp.stat(full);if(st.size<1024||Date.now()-st.mtimeMs<20000)continue; // avoid incomplete copies
        const parts=rel.split(path.sep);found.push({id:rel.split(path.sep).join('/'),title:path.parse(e.name).name,category:parts.length>1?parts[0]:'سایر',size:st.size,modified:st.mtime.toISOString(),extension:path.extname(e.name).slice(1).toUpperCase()});
      }catch(_){}}
  }
  try{await walk(ROOT,0);files=found.sort((a,b)=>b.modified.localeCompare(a.modified));scanError='';lastScan=Date.now()}
  catch(e){scanError=e.message;lastScan=Date.now()}
})().finally(()=>scanning=null);return scanning}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':CORS_ORIGIN,'Vary':'Origin'});res.end(JSON.stringify(data))};
const safeDecode=s=>{try{return decodeURIComponent(s)}catch{return ''}};
const srv=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':CORS_ORIGIN,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'X-Rush-Key','Access-Control-Max-Age':'600','Vary':'Origin'});return res.end()}
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed'});
  if(u.pathname==='/api/files'){if(!authorized(req))return json(res,401,{error:'کلید دسترسی آرشیو نامعتبر است'});
    if(Date.now()-lastScan>15000)await scan();
    const q=(u.searchParams.get('q')||'').trim().toLocaleLowerCase('fa');const cat=u.searchParams.get('category')||'';
    const selected=files.filter(x=>(!cat||x.category===cat)&&(!q||(x.title+' '+x.category).toLocaleLowerCase('fa').includes(q)));
    const page=Math.max(1,Math.min(9999,Number(u.searchParams.get('page'))||1));const limit=36;
    return json(res,200,{files:selected.slice((page-1)*limit,page*limit).map(f=>({...f,playUrl:signedUrl(f.id,false),downloadUrl:signedUrl(f.id,true)})),total:selected.length,page,pages:Math.max(1,Math.ceil(selected.length/limit)),categories:[...new Set(files.map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'fa')),all:files.length,error:scanError,lastScan});
  }
  if(u.pathname==='/api/rescan'){if(!authorized(req))return json(res,401,{error:'Unauthorized'});await scan();return json(res,200,{total:files.length,error:scanError})}
  if(u.pathname==='/video'){if(!allowedSigned(u))return json(res,403,{error:'لینک منقضی یا نامعتبر است'});
    const id=safeDecode(u.searchParams.get('id')||'');
    const record=files.find(x=>x.id===id);if(!record)return json(res,404,{error:'File not indexed'});
    const full=path.resolve(ROOT,...id.split('/'));if(!isSub(full))return json(res,403,{error:'Forbidden'});
    let st;try{st=await fsp.stat(full)}catch{return json(res,404,{error:'File unavailable'})}
    const total=st.size,range=req.headers.range;let start=0,end=total-1,status=200;
    if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m)return json(res,416,{error:'Invalid range'});
      if(m[1]===''&&m[2]!==''){const n=Number(m[2]);start=Math.max(0,total-n)}else{start=Number(m[1]);end=m[2]?Math.min(total-1,Number(m[2])):total-1}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start> end||start>=total){res.writeHead(416,{'Content-Range':`bytes */${total}`});return res.end()}status=206;
    }
    const download=u.searchParams.has('download');const headers={'Content-Type':MIME[path.extname(full).toLowerCase()]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=0','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':CORS_ORIGIN,'Vary':'Origin'};
    if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${total}`;
    if(download)headers['Content-Disposition']=`attachment; filename*=UTF-8''${encodeURIComponent(path.basename(full))}`;
    res.writeHead(status,headers);if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(full,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);return;
  }
  if(u.pathname==='/'||u.pathname==='/index.html'){
    const p=path.join(__dirname,'index.html');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return fs.createReadStream(p).pipe(res);
  }
  json(res,404,{error:'Not found'});
});
srv.listen(PORT,'0.0.0.0',()=>{console.log('RushFinder LAN: http://localhost:'+PORT);console.log('Folder:',ROOT);console.log('ARCHIVE ACCESS KEY (keep private):',API_KEY);for(const net of Object.values(os.networkInterfaces()).flat())if(net&&net.family==='IPv4'&&!net.internal)console.log('Other PCs: http://'+net.address+':'+PORT);scan()});
setInterval(()=>scan(),30000).unref();
