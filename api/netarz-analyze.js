import {netarzPost} from '../lib/netarz-common.js';
export default async function handler(req,res){
 try{
  const news=String(req.body?.news||'').trim();
  if(news.length<15||news.length>6500)return res.status(400).json({error:'متن خبر باید بین ۱۵ تا ۶۵۰۰ حرف باشد.'});
  const data=await netarzPost(req,res,'/chat/completions',{
   model:'gpt-6-astra',max_completion_tokens:750,
   messages:[{role:'system',content:'خبر فارسی را دقیق و بدون ساختن عدد یا اطلاعات جدید برای اینفوگرافیک آماده کن. فقط یک شیء JSON معتبر با کلیدهای title،subtitle،points (آرایه‌ای از ۳ تا ۸ جمله کوتاه فارسی)،visual_prompt (توصیف انگلیسی برای تصویر بدون نوشته) بده. آمارها و تاریخ‌ها را دقیق حفظ کن و هر ابهام را بدون حدس بیان کن.'},{role:'user',content:news}]
  });
  if(!data||res.headersSent)return;
  let content=data.choices?.[0]?.message?.content||'';
  if(Array.isArray(content))content=content.map(x=>x.text||'').join('');
  let obj;try{obj=JSON.parse(String(content).replace(/^```(?:json)?\s*|\s*```$/g,''))}catch{return res.status(502).json({error:'مدل پاسخ JSON معتبر نداد؛ لطفاً دوباره تست کن.'})}
  return res.status(200).json({title:String(obj.title||'').slice(0,180),subtitle:String(obj.subtitle||'').slice(0,260),points:Array.isArray(obj.points)?obj.points.slice(0,8).map(x=>String(x).slice(0,220)):[],visual_prompt:String(obj.visual_prompt||'').slice(0,500),usage:data.usage||null});
 }catch(e){return res.status(502).json({error:e.name==='AbortError'?'زمان پاسخ API تمام شد.':'ارتباط با نت‌ارز برقرار نشد.'})}
}
