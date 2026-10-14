import { timingSafeEqual } from 'node:crypto';
const BASE='https://api.elevenlabs.io/v1';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const key=process.env.ELEVENLABS_API_KEY;
 if(!key)return res.status(503).json({error:'کلید ELEVENLABS_API_KEY در Vercel تنظیم نشده است.'});
 if(req.method!=='POST')return res.status(405).json({error:'روش درخواست مجاز نیست.'});
 const pin=process.env.NARRATION_ACCESS_PIN;
 if(!pin || pin.length<12)return res.status(503).json({error:'برای محافظت از اعتبار ElevenLabs، متغیر NARRATION_ACCESS_PIN با حداقل ۱۲ کاراکتر در Vercel تنظیم شود.'});
 const supplied=String(req.headers['x-narration-pin']||'');
 const a=Buffer.from(supplied),b=Buffer.from(pin);
 if(a.length!==b.length || !timingSafeEqual(a,b))return res.status(401).json({error:'رمز دسترسی نریشن نادرست است.'});
 const action=req.body?.action;
 try{
  if(action==='voices'){
   const r=await fetch(BASE+'/voices',{headers:{'xi-api-key':key}});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)return res.status(r.status).json({error:data.detail?.message||data.detail||'دریافت صداها ناموفق بود.'});
   return res.status(200).json({voices:(data.voices||[]).map(v=>({id:v.voice_id,name:v.name,category:v.category,labels:v.labels||{},preview:v.preview_url||null}))});
  }
  if(action!=='generate')return res.status(400).json({error:'عملیات نامعتبر است.'});
  const text=String(req.body?.text||'').trim();
  const voice=String(req.body?.voice_id||'');
  if(!text||text.length>3500)return res.status(400).json({error:'متن باید بین ۱ تا ۳۵۰۰ نویسه باشد.'});
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(voice))return res.status(400).json({error:'صدای انتخاب‌شده معتبر نیست.'});
  const model=String(req.body?.model_id||'eleven_v4');
  if(!['eleven_v4','eleven_multilingual_v2'].includes(model))return res.status(400).json({error:'مدل انتخاب‌شده معتبر نیست.'});
  const stability=Math.max(0,Math.min(1,Number(req.body?.stability??0.55)));
  const similarity=Math.max(0,Math.min(1,Number(req.body?.similarity??0.8)));
  const r=await fetch(BASE+'/text-to-speech/'+encodeURIComponent(voice)+'?output_format=mp3_44100_128',{
   method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json','Accept':'audio/mpeg'},
   body:JSON.stringify({text,model_id:model,voice_settings:{stability,similarity_boost:similarity}})
  });
  if(!r.ok){const data=await r.json().catch(()=>({}));return res.status(r.status).json({error:typeof data.detail==='string'?data.detail:data.detail?.message||'تولید صدا ناموفق بود؛ اعتبار یا دسترسی حساب را بررسی کنید.'});}
  const bytes=Buffer.from(await r.arrayBuffer());
  res.setHeader('Content-Type','audio/mpeg');res.setHeader('Content-Disposition','attachment; filename="rushfinder-narration.mp3"');
  return res.status(200).send(bytes);
 }catch(e){return res.status(502).json({error:'ارتباط با ElevenLabs برقرار نشد.'});}
}
