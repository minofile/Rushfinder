import {netarzPost} from '../lib/netarz-common.js';
export default async function handler(req,res){
 try{
  const prompt=String(req.body?.prompt||'').trim();
  if(prompt.length<6||prompt.length>800)return res.status(400).json({error:'توضیح تصویر باید ۶ تا ۸۰۰ حرف باشد.'});
  const data=await netarzPost(req,res,'/images/generations',{model:'openrouter/recraft/recraft-v3',prompt:prompt+'\nNO WORDS, NO LETTERS, NO NUMBERS, NO TEXT, NO TYPOGRAPHY, NO WATERMARK, NO LOGO.',n:1,size:'1024x1024'});
  if(!data||res.headersSent)return;
  const item=data.data?.[0];
  const image=item?.b64_json?'data:'+(item.media_type||'image/png')+';base64,'+item.b64_json:item?.url;
  if(!image)return res.status(502).json({error:'پاسخ تصویر از نت‌ارز فاقد داده تصویری بود.'});
  return res.status(200).json({image});
 }catch(e){return res.status(502).json({error:e.name==='AbortError'?'تولید تصویر بیشتر از زمان مجاز طول کشید.':'اتصال تولید تصویر ناموفق بود.'})}
}
