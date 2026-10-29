// RushFinder 0709 - image provider via a server-side OpenAI-compatible image endpoint.
// IMPORTANT: Confirm full image-generation URL and model ID in the provider documentation.
// No secrets belong in browser JS or in source control.
const send=(res,status,body)=>{res.status(status).json(body);};
const clean=(s)=>String(s||'').slice(0,500).replace(/(?:sk-|Bearer\s+)[A-Za-z0-9_-]{8,}/gi,'[SECRET]');
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const key=String(process.env.CHABOKAN_API_KEY||'').trim();
 const rawUrl=String(process.env.CHABOKAN_IMAGE_URL||'').trim();
 const model=String(process.env.CHABOKAN_IMAGE_MODEL||'').trim();
 let url;
 try {url=new URL(rawUrl);if(url.protocol!=='https:'||url.username||url.password||!url.hostname||url.search||url.hash)throw Error();}
 catch{url=null;}
 // Prevent arbitrary client-controlled destinations. Provider URL is server-only env.
 const missing=[!key&&'CHABOKAN_API_KEY',!url&&'CHABOKAN_IMAGE_URL',!model&&'CHABOKAN_IMAGE_MODEL'].filter(Boolean);
 if(req.method==='GET'&&req.query?.probe==='gemini'){
  return send(res,200,{ok:missing.length===0,code:missing.length?'MISSING_CONFIG':'CONFIGURED',message:missing.length?'تنظیمات سرور ناقص است: '+missing.join(', '):'تنظیمات Gemini ثبت شده است. تولید تصویر هنوز آزمایش نشده و ممکن است هزینه داشته باشد.',model:model||null});
 }
 if(req.method!=='POST')return send(res,405,{error:'فقط درخواست POST پذیرفته می‌شود.'});
 if(missing.length)return send(res,503,{error:'تنظیمات سرور ناقص است: '+missing.join(', '),definitiveRejection:true});
 const prompt=String(req.body?.prompt||'').trim();
 if(prompt.length<30||prompt.length>3500)return send(res,400,{error:'توضیح تصویر نامعتبر است.',definitiveRejection:true});
 const size=req.body?.size==='story'?'1024x1536':'1024x1024';
 const payload={model,prompt,n:1,size,response_format:'b64_json'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),165000);
 const started=Date.now();
 try{
  const upstream=await fetch(url.href,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(payload),signal:controller.signal,redirect:'error'});
  let data;try{data=await upstream.json()}catch{data=null;}
  if(!upstream.ok){
   const reason=data?.error?.message||data?.message||data?.error?.detail||'';
   return send(res,[400,401,402,403,404,422,429].includes(upstream.status)?upstream.status:502,{error:'خطای سرویس تصویر (HTTP '+upstream.status+'). '+clean(typeof reason==='string'?reason:''),upstreamStatus:upstream.status,definitiveRejection:[400,401,402,403,404,422,429].includes(upstream.status)});
  }
  const first=data?.data?.[0]||data?.images?.[0]||null;
  const b64=first?.b64_json||data?.b64_json||null;
  if(typeof b64==='string'&&b64.length)return send(res,200,{image:'data:image/png;base64,'+b64,model,elapsedMs:Date.now()-started});
  const remote=typeof first==='string'?first:first?.url||data?.image||'';
  if(typeof remote==='string'&&remote.startsWith('data:image/'))return send(res,200,{image:remote,model,elapsedMs:Date.now()-started});
  // Return HTTPS image URL to client: avoids server-side URL fetch / SSRF.
  if(typeof remote==='string'&&/^https:\/\//i.test(remote))return send(res,200,{image:remote,model,elapsedMs:Date.now()-started});
  return send(res,502,{error:'تصویر در پاسخ سرویس وجود نداشت یا قالب پاسخ متفاوت است. مستندات API چابکان را بررسی کنید.',definitiveRejection:false});
 }catch(e){return send(res,502,{error:e?.name==='AbortError'?'زمان پاسخ سرویس تمام شد؛ قبل از تلاش دوباره مصرف اعتبار را بررسی کنید.':'اتصال به سرویس تصویر برقرار نشد. آدرس API را بررسی کنید.',definitiveRejection:false});}
 finally{clearTimeout(timer);}
}
