const {Readable}=require('stream');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).end();
 const id=String(req.query.id||'');
 if(!/^[a-zA-Z0-9]{2,32}$/.test(id))return res.status(400).json({error:'شناسه آهنگ نامعتبر است'});
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),25000);
 try{
  const meta=await fetch('https://api.audius.co/v1/tracks/'+encodeURIComponent(id),{signal:ctrl.signal});
  if(!meta.ok)throw Error('اطلاعات آهنگ در دسترس نیست');
  const j=await meta.json();const t=j.data||{};
  if(!(t.access?.download===true&&t.is_downloadable===true&&!t.is_download_gated))return res.status(403).json({error:'این آهنگ اجازه دانلود ندارد'});
  const r=await fetch('https://api.audius.co/v1/tracks/'+encodeURIComponent(id)+'/download',{signal:ctrl.signal,headers:{Accept:'audio/*,application/octet-stream'}});
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  if(!r.ok||!r.body||!(ct.startsWith('audio/')||ct.includes('octet-stream')))return res.status(502).json({error:'فایل صوتی واقعی از Audius دریافت نشد'});
  res.setHeader('Content-Type',ct);res.setHeader('Content-Disposition','attachment; filename="audius-'+id+'.mp3"');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const stream=Readable.fromWeb(r.body);stream.on('error',()=>res.destroy());stream.pipe(res);
  res.on('close',()=>{clearTimeout(timer);if(!res.writableFinished)ctrl.abort()});
 }catch(e){if(!res.headersSent)res.status(502).json({error:'دانلود این آهنگ در حال حاضر در دسترس نیست'});else res.destroy()}finally{clearTimeout(timer)}
};
