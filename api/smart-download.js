// RushFinder SmartEdit 0913: GET-only transient relay for PUBLIC Wikimedia media.
// No user uploads; media is streamed and never stored on Vercel.
const {Readable,Transform,pipeline}=require('node:stream');
const {promisify}=require('node:util');
const pipe=promisify(pipeline),MAX=50_000_000;
module.exports=async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Only GET is supported'});
 const input=String(req.query.url||'');let url;
 try{url=new URL(input);if(url.protocol!=='https:'||url.hostname!=='upload.wikimedia.org'||!/[.](mp4|webm)$/i.test(url.pathname)||url.username||url.password||url.port)throw Error('not a permitted Wikimedia video URL');}
 catch{return res.status(400).json({error:'Only direct Wikimedia MP4/WebM is allowed'})}
 const c=new AbortController(),tm=setTimeout(()=>c.abort(),25000);
 try{
  const response=await fetch(url,{redirect:'manual',signal:c.signal,headers:{'User-Agent':'RushFinderSmartEdit/0913 (https://rushfinder.vercel.app/)'}});
  if(response.status>=300||!response.ok)return res.status(502).json({error:'Media host did not return a direct video'});
  const len=Number(response.headers.get('content-length')||0);
  if(len>MAX)return res.status(413).json({error:'Video exceeds the 50 MB limit'});
  const content=response.headers.get('content-type')||'';
  if(!/video\/(mp4|webm)|application\/(octet-stream|x-matroska)/i.test(content))return res.status(415).json({error:'Upstream content was not a video'});
  res.setHeader('Content-Type',url.pathname.toLowerCase().endsWith('.webm')?'video/webm':'video/mp4');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  let count=0;const limiter=new Transform({transform(chunk,enc,cb){count+=chunk.length;if(count>MAX)cb(new Error('Media too large'));else cb(null,chunk)}});
  await pipe(Readable.fromWeb(response.body),limiter,res);
 }catch(e){c.abort();if(!res.headersSent)res.status(502).json({error:'Public video relay failed'});else res.destroy();}
 finally{clearTimeout(tm)}
};
