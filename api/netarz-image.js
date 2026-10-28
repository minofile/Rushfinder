// RushFinder 9Router image generation endpoint for infographic testing on Vercel.
// Requires a public Cloudflare tunnel URL that forwards to the local Rush proxy.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET' && req.query?.probe==='9router'){
  const fields=['RUSH_9ROUTER_TUNNEL_URL','RUSH_9ROUTER_API_KEY','RUSH_9ROUTER_PROXY_SECRET'];
  const missing=fields.filter(k=>!process.env[k]);
  return res.status(200).json(missing.length?{ok:false,code:'MISSING_ENV',message:'تنظیمات ناقص است: '+missing.join('، ')}:{ok:true,code:'CONFIGURED',message:'سه تنظیم Vercel ثبت شده‌اند؛ هنوز درخواست واقعی تصویر آزمایش نشده است.'});
 }
 // Non-billable, read-only connectivity diagnostic. The proxy deliberately responds 404 to GET /.
 if(req.method==='GET' && req.query?.probe==='tunnel'){
  const tunnel=(process.env.RUSH_9ROUTER_TUNNEL_URL||'').trim().replace(/\/$/,'');
  if(!tunnel)return res.status(200).json({ok:false,code:'MISSING_TUNNEL_URL'});
  let u;
  try{u=new URL(tunnel);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Invalid URL');}
  catch{return res.status(200).json({ok:false,code:'INVALID_TUNNEL_URL'});}
  const started=Date.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  try{
   const response=await fetch(u.toString(),{method:'GET',redirect:'manual',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
   // A GET on the protected Rush proxy root is intentionally rejected with 404 JSON.
   const ct=response.headers.get('content-type')||'';
   const body=await response.text();
   let parsed=null;try{parsed=JSON.parse(body)}catch{}
   const matchesProxy=response.status===404&&ct.includes('application/json')&&parsed?.error==='Not found';
   return res.status(200).json({ok:matchesProxy,code:matchesProxy?'TUNNEL_REACHABLE':'UNEXPECTED_RESPONSE',status:response.status,contentType:ct.split(';')[0],elapsedMs:Date.now()-started,message:matchesProxy?'Vercel به پراکسی از طریق تونل رسید؛ هیچ درخواست تصویر ارسال نشد.':'سرور پاسخ داد اما پاسخ مورد انتظار پراکسی دریافت نشد. آدرس تونل و اجرای پراکسی را بررسی کن.'});
  }catch(e){
   const cause=e?.cause||{};
   return res.status(200).json({ok:false,code:e?.name==='AbortError'?'TIMEOUT':'NETWORK_FAILURE',detail:String(cause.code||e?.code||e?.name||'UNKNOWN').slice(0,80),elapsedMs:Date.now()-started,message:'سرور Vercel نتوانست به تونل متصل شود؛ آدرس، شبکه یا لاگ Cloudflare را بررسی کن.'});
  }finally{clearTimeout(timer);}
 }
 // Free diagnostic: POST reaches the protected proxy, then is rejected before model usage.
 if(req.method==='GET' && req.query?.probe==='post'){
  const tunnel=(process.env.RUSH_9ROUTER_TUNNEL_URL||'').trim().replace(/\/$/,'');
  const apiKey=process.env.RUSH_9ROUTER_API_KEY||'';
  const secret=process.env.RUSH_9ROUTER_PROXY_SECRET||'';
  if(!tunnel||!apiKey||!secret)return res.status(200).json({ok:false,code:'MISSING_ENV'});
  const started=Date.now();const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetch(tunnel+'/v1/images/generations',{
    method:'POST',redirect:'manual',signal:controller.signal,
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey,'x-rush-secret':secret},
    body:JSON.stringify({model:'__test_invalid_no_model_call__',prompt:'This is a connectivity check; do not generate an image.'})
   });
   const body=(await r.text()).slice(0,350);let parsed={};try{parsed=JSON.parse(body)}catch{}
   const valid=r.status===400&&parsed.error==='Model not allowed';
   return res.status(200).json({ok:valid,code:valid?'PROTECTED_POST_OK':'POST_UNEXPECTED',status:r.status,elapsedMs:Date.now()-started,message:valid?'درخواست POST از Vercel به پراکسی رسید و قبل از مصرف اعتبار رد شد.':'پاسخ غیرمنتظره در مسیر POST.',detail:valid?undefined:String(parsed.error||'').slice(0,120)});
  }catch(e){return res.status(200).json({ok:false,code:e.name==='AbortError'?'POST_TIMEOUT':'POST_NETWORK_FAILURE',detail:String(e?.cause?.code||e?.code||e?.name||'UNKNOWN').slice(0,80),elapsedMs:Date.now()-started});}
  finally{clearTimeout(timer)}
 }
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
  return res.status(502).json({error:e?.name==='AbortError'?'زمان پاسخ 9Router طولانی شد؛ پراکسی محلی و 9Router را بررسی کن.':'ارتباط Vercel با تونل 9Router برقرار نشد.',detail:String(e?.cause?.code||e?.code||e?.message||'UNKNOWN').slice(0,140)});
 }finally{clearTimeout(timer)}
}
