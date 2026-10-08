// Download only Freesound's publicly provided MP3 preview, never the original file.
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).end();
  const id=String(req.query.id||'');
  if(!/^\d{1,12}$/.test(id))return res.status(400).json({error:'شناسه نامعتبر است'});
  const key=process.env.FREESOUND_API_KEY;
  if(!key)return res.status(503).json({error:'کلید Freesound تنظیم نشده است'});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const meta=await fetch(`https://freesound.org/apiv2/sounds/${id}/?fields=id,previews,license,name`,{headers:{Authorization:`Token ${key}`},signal:controller.signal});
    if(!meta.ok)return res.status(502).json({error:'دریافت اطلاعات آهنگ ناموفق بود'});
    const sound=await meta.json();
    const preview=sound.previews?.['preview-hq-mp3']||sound.previews?.['preview-lq-mp3'];
    if(!preview||!/^https:\/\/(?:[^/]+\.)?freesound\.org\//i.test(preview))return res.status(404).json({error:'نسخه MP3 قابل دانلود نیست'});
    const audio=await fetch(preview,{signal:controller.signal,headers:{Accept:'audio/mpeg,audio/*;q=0.9,*/*;q=0.5'}});
    if(!audio.ok)return res.status(502).json({error:'سرور منبع فایل MP3 را ارائه نکرد'});
    const mime=(audio.headers.get('content-type')||'').toLowerCase();
    if(mime.includes('json')||mime.includes('text/html'))return res.status(502).json({error:'منبع به جای آهنگ پاسخ خطا فرستاد'});
    const length=Number(audio.headers.get('content-length')||0);
    if(length>25*1024*1024)return res.status(413).json({error:'حجم فایل بیش از حد مجاز است'});
    const bytes=Buffer.from(await audio.arrayBuffer());
    if(bytes.length>25*1024*1024)return res.status(413).json({error:'حجم فایل بیش از حد مجاز است'});
    if(bytes.length<1024||(!bytes.subarray(0,3).equals(Buffer.from('ID3'))&&!(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0)))return res.status(502).json({error:'پاسخ منبع فایل MP3 معتبر نیست'});
    res.setHeader('Content-Type','audio/mpeg');
    res.setHeader('Content-Disposition',`attachment; filename="freesound-${id}-preview.mp3"`);
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    return res.status(200).send(bytes);
  }catch{return res.status(502).json({error:'دانلود فایل پیش‌نمایش انجام نشد'});}finally{clearTimeout(timer)}
};
