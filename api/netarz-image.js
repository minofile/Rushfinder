// RushFinder 608: OpenRouter Images API. Uses existing endpoint to stay within Vercel function limits.
// Never put OPENROUTER_API_KEY into the frontend or response.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'فقط درخواست POST پذیرفته می‌شود.'});
 const key=process.env.OPENROUTER_API_KEY;
 if(!key)return res.status(503).json({error:'متغیر OPENROUTER_API_KEY در Vercel ثبت نشده است.'});
 const prompt=String(req.body?.prompt||'').trim();
 if(prompt.length<30||prompt.length>3500)return res.status(400).json({error:'توضیح تصویر نامعتبر است.'});
 const shape=req.body?.size==='story'?'story':'square';
 const model='openai/gpt-image-2.5-sunburst';
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),115000);
 try{
  const r=await fetch('https://openrouter.ai/api/v1/images',{
   method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',Accept:'application/json','HTTP-Referer':'https://rushfinder.vercel.app','X-Title':'RushFinder'},
   body:JSON.stringify({model,prompt,aspect_ratio:shape==='story'?'9:16':'1:1',n:1}),
   signal:controller.signal,redirect:'error'
  });
  if(!r.ok){
   let err='';try{const d=await r.json();err=String(d?.error?.message||d?.message||'').slice(0,240)}catch{}
   if(r.status===402)return res.status(402).json({error:'اعتبار OpenRouter برای ساخت تصویر کافی نیست. طبق راهنمای این سرویس، موجودی باید بیش از ۱ دلار باشد.'});
   if(r.status===401)return res.status(401).json({error:'کلید OpenRouter نامعتبر یا غیرفعال است.'});
   if(r.status===403)return res.status(403).json({error:'دسترسی Vercel به مدل تصویر توسط OpenRouter مسدود شده است.'});
   if(r.status===429)return res.status(429).json({error:'محدودیت تعداد درخواست‌های OpenRouter فعال است.'});
   return res.status(502).json({error:'مدل تصویر پاسخ ناموفق داد (HTTP '+r.status+'). '+err});
  }
  const d=await r.json();const first=d?.data?.[0];
  const b64=first?.b64_json;
  if(typeof b64!=='string'||!b64.length)return res.status(502).json({error:'مدل تصویر تولید کرد ولی دادهٔ تصویر در پاسخ وجود نداشت.'});
  if(b64.length>17000000)return res.status(502).json({error:'اندازه تصویر برای ارسال به مرورگر بیش از حد بزرگ است.'});
  const mime=['image/png','image/jpeg','image/webp'].includes(first.media_type)?first.media_type:'image/png';
  return res.status(200).json({image:'data:'+mime+';base64,'+b64,model,usage_cost:typeof d?.usage?.cost==='number'?d.usage.cost:null});
 }catch(e){return res.status(502).json({error:e?.name==='AbortError'?'زمان ساخت تصویر طولانی شد؛ پیش از درخواست دوباره، مصرف اعتبار را در OpenRouter بررسی کن.':'ارتباط تولید تصویر با OpenRouter ناموفق بود.'});}
 finally{clearTimeout(timer)}
}
