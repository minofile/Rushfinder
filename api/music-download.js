// V0167: stream only Freesound's public MP3 preview, avoiding Vercel response-size failures.
const {Readable}=require('stream');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).end();
 const id=String(req.query.id||'');
 if(!/^\d{1,12}$/.test(id))return res.status(400).json({error:'شناسه نامعتبر است'});
 const key=process.env.FREESOUND_API_KEY;
 if(!key)return res.status(503).json({error:'کلید Freesound تنظیم نشده است'});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try{
  const meta=await fetch(`https://freesound.org/apiv2/sounds/${id}/?fields=id,previews,license,name`,{headers:{Authorization:`Token ${key}`},signal:controller.signal});
  if(!meta.ok)return res.status(502).json({error:'اطلاعات این آهنگ از Freesound دریافت نشد'});
  const sound=await meta.json();
  const candidates=[sound.previews?.['preview-hq-mp3'],sound.previews?.['preview-lq-mp3']].filter(u=>typeof u==='string'&&/^https:\/\/(?:[^/]+\.)?freesound\.org\//i.test(u));
  if(!candidates.length)return res.status(404).json({error:'نسخه MP3 این آهنگ در دسترس نیست'});
  let audio=null;
  for(const url of candidates){
   try{const response=await fetch(url,{signal:controller.signal,headers:{Accept:'audio/mpeg,audio/*;q=0.9,*/*;q=0.5'}});
    const type=(response.headers.get('content-type')||'').toLowerCase();
    if(response.ok&&response.body&&!type.includes('json')&&!type.includes('html')&&!type.includes('text/')){audio=response;break}
   }catch(e){if(controller.signal.aborted)throw e}
  }
  if(!audio)return res.status(502).json({error:'سرور Freesound فایل MP3 این آهنگ را ارائه نکرد'});
  res.status(200);
  res.setHeader('Content-Type','audio/mpeg');
  res.setHeader('Content-Disposition',`attachment; filename="freesound-${id}-preview.mp3"`);
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const stream=Readable.fromWeb(audio.body);
  stream.on('error',()=>{if(!res.headersSent)res.status(502).end();else res.destroy()});
  stream.pipe(res);
  res.on('close',()=>{clearTimeout(timer);if(!res.writableFinished)controller.abort()});
 }catch(e){clearTimeout(timer);if(!res.headersSent)return res.status(502).json({error:'دریافت فایل صوتی از منبع انجام نشد'});res.destroy()}
};
