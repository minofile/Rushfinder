import {netarzPost} from '../lib/netarz-common.js';

// OpenRouter connectivity probe. No paid model invocation, no API-key disclosure.
async function rf607ProbeOpenRouter(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED'});
  const key=process.env.OPENROUTER_API_KEY;
  if(!key) return res.status(200).json({ok:false,code:'MISSING_KEY',message:'کلید OPENROUTER_API_KEY در Vercel تنظیم نشده است.'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch('https://openrouter.ai/api/v1/auth/key',{
      method:'GET',headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},
      signal:controller.signal,redirect:'error'
    });
    // Never forward response bodies: some providers may include account identifiers.
    if(response.ok)return res.status(200).json({ok:true,code:'CONNECTED',message:'اتصال Vercel به OpenRouter و اعتبار کلید تأیید شد.'});
    if(response.status===401)return res.status(200).json({ok:false,code:'INVALID_KEY',message:'کلید از طرف OpenRouter پذیرفته نشد (401).'});
    if(response.status===403)return res.status(200).json({ok:false,code:'BLOCKED',message:'OpenRouter درخواست Vercel را رد کرد (403). ممکن است محدودیت امنیتی یا دسترسی باشد.'});
    if(response.status===429)return res.status(200).json({ok:false,code:'RATE_LIMITED',message:'محدودیت تعداد درخواست اعمال شده است (429).'});
    return res.status(200).json({ok:false,code:'UPSTREAM_ERROR',status:response.status,message:'OpenRouter پاسخ ناموفق داد: '+response.status});
  }catch(e){
    return res.status(200).json({ok:false,code:e.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR',message:e.name==='AbortError'?'مهلت اتصال به OpenRouter تمام شد.':'ارتباط سرور Vercel با OpenRouter برقرار نشد.'});
  }finally{clearTimeout(timeout)}
}

export default async function handler(req,res){
 if(req.query?.probe==='openrouter')return rf607ProbeOpenRouter(req,res);
 try{
  const news=String(req.body?.news||'').trim();
  if(news.length<15||news.length>6500)return res.status(400).json({error:'متن خبر باید بین ۱۵ تا ۶۵۰۰ حرف باشد.'});
  const data=await netarzPost(req,res,'/chat/completions',{
   model:'gpt-6-astra',max_completion_tokens:1400,
   messages:[{role:'system',content:'تو مدیر هنری و تحلیلگر دقیق اینفوگرافیک خبری فارسی RushFinder هستی. تنها ورودی کاربر متن خبر است و تو بدون درخواست پرامپت یا توضیح طراحی از او، سبک حرفه‌ای متناسب با محتوا را انتخاب می‌کنی. فقط JSON معتبر برگردان با کلیدهای title, subtitle, points (آرایه ۳ تا ۱۲ عبارت کوتاه و دقیق فارسی), layout (یکی از comparison, cards, timeline, chart, table, 3d), visual_prompt (یک پرامپت انگلیسی حرفه‌ای برای فقط عناصر تصویری). تیتر خبری بسیار کوتاه و مناسب نمایش تک‌خطی، بدون جعل محتوا باشد. تمام سال‌ها، اعداد و دسته‌بندی‌های آمار را عیناً حفظ کن؛ دسته مجهول را تفسیر نکن و صفر نساز. مقایسه سال جاری و قبل را در صورت وجود در قالب دو ستون راست‌به‌چپ سازمان بده. visual_prompt باید جزئیات تصویری فراوان، premium polished editorial 3D/semi-3D, elegant layered depth, sculpted glossy icons, rich material textures, dramatic yet tasteful lighting, sophisticated brand colors, purposeful decorative elements for EACH section, subtle local context, generous clean areas for overlaying Persian content داشته باشد. رنگ و نماد باید با موضوع واقعی خبر تناسب داشته باشد، نه اینکه در همه خبرها خورشید و ابر تکرار شود. Recraft فقط تصاویر خام و المان‌های تزئینی بسازد؛ هیچ‌گونه متن، عدد، حرف، نمودار داده، کارت آماری پرشده، لوگو، واترمارک یا تایپوگرافی در خود تصویر مجاز نیست. تمام متن‌ها، ارقام، کارت‌های آماری و لوگو بعداً در RushFinder ترسیم می‌شوند. پرامپت انگلیسی حداکثر ۷۰۰ نویسه باشد. JSON را بدون markdown بده.'},{role:'user',content:news}]
  });
  if(!data||res.headersSent)return;
  let content=data.choices?.[0]?.message?.content||'';
  if(Array.isArray(content))content=content.map(x=>x.text||'').join('');
  let obj;try{obj=JSON.parse(String(content).replace(/^```(?:json)?\s*|\s*```$/g,''))}catch{return res.status(502).json({error:'مدل پاسخ JSON معتبر نداد؛ لطفاً دوباره تست کن.'})}
  return res.status(200).json({title:String(obj.title||'').slice(0,180),subtitle:String(obj.subtitle||'').slice(0,260),points:Array.isArray(obj.points)?obj.points.slice(0,12).map(x=>String(x).slice(0,220)):[],visual_prompt:String(obj.visual_prompt||'').slice(0,750),layout:['comparison','cards','timeline','chart','table','3d'].includes(obj.layout)?obj.layout:'3d',usage:data.usage||null});
 }catch(e){return res.status(502).json({error:e.name==='AbortError'?'زمان پاسخ API تمام شد.':'ارتباط با نت‌ارز برقرار نشد.'})}
}
