// RushFinder 0956 - Hermes relay merged into api/chat through lib; no extra Vercel function.
const crypto=require('crypto');
const MAX_JSON=3_500_000;
function reply(res,code,data){res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));}
function safeEqual(a,b){const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
async function callBridge(path,{method='GET',body,clientToken}={}){
 const raw=process.env.RF_HERMES_BRIDGE_URL||'';
 let base;try{base=new URL(raw)}catch{throw Error('آدرس سرور Hermes تنظیم نشده است.')}
 if(base.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(base.hostname)&&base.protocol==='http:'))throw Error('اتصال Hermes باید HTTPS باشد.');
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),16000);
 try{
  const r=await fetch(new URL(path,base).href,{method,signal:ctrl.signal,redirect:'error',headers:{'X-Rush-Bridge-Key':process.env.RF_HERMES_BRIDGE_KEY||'',...(clientToken?{'X-Rush-Client-Token':clientToken}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data=await r.json().catch(()=>({error:'Invalid Hermes response'}));return {status:r.status,data};
 }finally{clearTimeout(timeout)}
}
module.exports=async function handler(req,res){
 if(req.method==='OPTIONS'){res.setHeader('Allow','GET, POST');return reply(res,200,{ok:true})}
 if(req.method==='GET'){
  const ready=Boolean(process.env.RF_HERMES_BRIDGE_URL&&process.env.RF_HERMES_BRIDGE_KEY&&process.env.RF_HERMES_SITE_CODE);
  if(!ready)return reply(res,200,{ok:true,configured:false,online:false});
  try{const r=await callBridge('/health');return reply(res,200,{ok:true,configured:true,online:Boolean(r.data?.ok)})}
  catch{return reply(res,200,{ok:true,configured:true,online:false})}
 }
 if(req.method!=='POST')return reply(res,405,{error:'Method not allowed'});
 if(!process.env.RF_HERMES_BRIDGE_URL||!process.env.RF_HERMES_BRIDGE_KEY||!process.env.RF_HERMES_SITE_CODE)return reply(res,503,{error:'اتصال Hermes هنوز توسط مدیر سایت تنظیم نشده است.'});
 const code=req.headers['x-rf-access-code']||'';
 if(!safeEqual(code,process.env.RF_HERMES_SITE_CODE))return reply(res,403,{error:'کد دسترسی تدوین نادرست است.'});
 try{
  let data=req.body;
  if(typeof data==='string'){if(data.length>MAX_JSON)return reply(res,413,{error:'فایل بیش از حد بزرگ است.'});data=JSON.parse(data)}
  if(!data||typeof data!=='object')return reply(res,400,{error:'Invalid request'});
  const token=String(data.client_token||'');if(token.length<28||token.length>120)return reply(res,400,{error:'Invalid session token'});
  if(data.op==='submit'){
   const script=String(data.script||'').trim();if(script.length<3||script.length>20000)return reply(res,400,{error:'متن تدوین باید بین ۳ تا ۲۰۰۰۰ کاراکتر باشد.'});
   if(data.audio?.base64?.length>2_700_000)return reply(res,413,{error:'فایل نریشن باید حداکثر ۲ مگابایت باشد.'});
   const r=await callBridge('/jobs',{method:'POST',body:{script,client_token:token,audio:data.audio||undefined}});
   return reply(res,r.status,r.data)
  }
  if(data.op==='status'){
   const id=String(data.id||'');if(!/^[\w-]{10,80}$/.test(id))return reply(res,400,{error:'Invalid job id'});
   const r=await callBridge('/jobs/'+id,{clientToken:token});return reply(res,r.status,r.data)
  }
  return reply(res,400,{error:'Unknown operation'});
 }catch(e){return reply(res,502,{error:e.name==='AbortError'?'Hermes پاسخ نداد؛ اتصال را بررسی کن.':'ارتباط با Hermes برقرار نشد: '+String(e.message||e).slice(0,180)})}
}
