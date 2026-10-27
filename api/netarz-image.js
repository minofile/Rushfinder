import {netarzPost} from '../lib/netarz-common.js';
export default async function handler(req,res){
 try{
  const prompt=String(req.body?.prompt||'').trim();
  if(prompt.length<6||prompt.length>800)return res.status(400).json({error:'توضیح تصویر باید ۶ تا ۸۰۰ حرف باشد.'});
  const data=await netarzPost(req,res,'/images/generations',{model:'openrouter/recraft/recraft-v3',prompt:prompt+'\nNO WORDS, NO LETTERS, NO NUMBERS, NO TEXT, NO TYPOGRAPHY, NO WATERMARK, NO LOGO.',n:1,size:'1024x1024'});
  if(!data||res.headersSent)return;
  const item=data.data?.[0];
  let image=item?.b64_json?'data:'+(item.media_type||'image/png')+';base64,'+item.b64_json:item?.url;
  // A cross-origin image would taint the browser canvas and prevent PNG export.
  // For trusted image CDN hosts only, convert the asset to a self-contained data URL.
  if(image && /^https:\/\//i.test(image)){
   try{
    const u=new URL(image);
    const h=u.hostname.toLowerCase();
    const domains=['recraft.ai','replicate.delivery','fal.media','fal.ai','openrouter.ai','netarz.ir','gisoo.pro','cloudfront.net','blob.core.windows.net'];
    if(domains.some(d=>h===d||h.endsWith('.'+d))){
     const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),18000);
     try{
      const r=await fetch(u.toString(),{signal:ac.signal,redirect:'error'});
      const mime=(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
      const len=Number(r.headers.get('content-length')||0);
      if(r.ok && ['image/png','image/jpeg','image/webp'].includes(mime) && (!len||len<=9000000)){
       const b=Buffer.from(await r.arrayBuffer());
       if(b.length<=9000000)image='data:'+mime+';base64,'+b.toString('base64');
      }
     }finally{clearTimeout(timer)}
    }
   }catch{/* Browser will try direct CORS loading if image hosting cannot be proxied. */}
  }
  if(!image)return res.status(502).json({error:'پاسخ تصویر از نت‌ارز فاقد داده تصویری بود.'});
  return res.status(200).json({image});
 }catch(e){return res.status(502).json({error:e.name==='AbortError'?'تولید تصویر بیشتر از زمان مجاز طول کشید.':'اتصال تولید تصویر ناموفق بود.'})}
}
