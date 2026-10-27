import {netarzPost} from '../lib/netarz-common.js';
export default async function handler(req,res){
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
