// RushFinder 9Router image generation endpoint for infographic testing on Vercel.
// Requires a public Cloudflare tunnel URL that forwards to the local Rush proxy.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'فقط درخواست POST پذیرفته می‌شود.'});
 const tunnel=(process.env.RUSH_9ROUTER_TUNNEL_URL||process.env.NINE_ROUTER_TUNNEL_URL||'').trim().replace(/\/$/,'');
 const apiKey=(process.env.RUSH_9ROUTER_API_KEY||process.env.NINE_ROUTER_API_KEY||'').trim();
 const proxySecret=(process.env.RUSH_9ROUTER_PROXY_SECRET||process.env.RUSH_PROXY_SECRET||'').trim();
 if(!tunnel)return res.status(503).json({error:'متغیر RUSH_9ROUTER_TUNNEL_URL در Vercel ثبت نشده است.'});
 if(!apiKey)return res.status(503).json({error:'متغیر RUSH_9ROUTER_API_KEY در Vercel ثبت نشده است.'});
 if(!proxySecret)return res.status(503).json({error:'متغیر RUSH_9ROUTER_PROXY_SECRET در Vercel ثبت نشده است.'});
 const prompt=String(req.body?.prompt||'').trim();
 if(prompt.length<30||prompt.length>3500)return res.status(400).json({error:'توضیح تصویر نامعتبر است.'});
 const shape=req.body?.size==='story'?'story':'square';
 const payload={
  model:'cx/gpt-image-2.5-flare',
  prompt,
  size:shape==='story'?'1024x1536':'1024x1024',
  quality:'auto',
  background:'auto'
 };
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),185000);
 try{
  const r=await fetch(tunnel+'/v1/images/generations',{
   method:'POST',
   headers:{
    'Content-Type':'application/json',
    'Accept':'application/json',
    'Authorization':'Bearer '+apiKey,
    'x-rush-secret':proxySecret
   },
   body:JSON.stringify(payload),
   signal:controller.signal,
   redirect:'error'
  });
  let d=null; try{d=await r.json()}catch{}
  if(!r.ok){
   const upstream=String(d?.error?.message||d?.error||d?.message||'').slice(0,240);
   if(r.status===401)return res.status(401).json({error:'کلید 9Router یا توکن پراکسی پذیرفته نشد.'});
   if(r.status===404)return res.status(502).json({error:'آدرس تونل 9Router نادرست است یا پراکسی محلی اجرا نشده است.'});
   if(r.status===429)return res.status(429).json({error:'محدودیت تست فعال شده یا هم‌زمان درخواست دیگری در حال اجراست.'});
   return res.status(502).json({error:'پاسخ ناموفق از 9Router دریافت شد (HTTP '+r.status+'). '+upstream});
  }
  const first=d?.data?.[0];
  const b64=first?.b64_json;
  if(typeof b64!=='string'||!b64.length)return res.status(502).json({error:'تصویر در پاسخ 9Router وجود نداشت.'});
  const mime=['image/png','image/jpeg','image/webp'].includes(first?.media_type)?first.media_type:'image/png';
  return res.status(200).json({image:'data:'+mime+';base64,'+b64,model:'cx/gpt-image-2.5-flare'});
 }catch(e){
  return res.status(502).json({error:e?.name==='AbortError'?'زمان پاسخ 9Router طولانی شد؛ پراکسی محلی و 9Router را بررسی کن.':'ارتباط Vercel با تونل 9Router برقرار نشد.'});
 }finally{clearTimeout(timer)}
}
