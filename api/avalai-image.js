// RushFinder 0709 - Chabokan Gemini image via OpenAI-compatible chat/completions.
// Server-side only. Never add API keys to source files or browser code.
const send=(res,status,body)=>res.status(status).json(body);
const safeError=(value)=>String(value||'').slice(0,250).replace(/sk-[A-Za-z0-9_-]+|Bearer\s+\S+/gi,'[REDACTED]');
const VALID_ENDPOINT='https://ai.chabokan.net/v1/chat/completions';
function imageFrom(obj){
 if(!obj)return null;
 if(typeof obj==='string'){
  if(/^data:image\/(png|jpeg|webp);base64,/i.test(obj))return obj;
  if(/^https:\/\//i.test(obj))return obj;
  return null;
 }
 if(Array.isArray(obj)) {for(const item of obj){const result=imageFrom(item);if(result)return result;}return null;}
 if(typeof obj!=='object')return null;
 const b64=obj.b64_json||obj.image_base64||obj.base64;
 if(typeof b64==='string'&&b64.length>60&&/^[A-Za-z0-9+/=\s]+$/.test(b64))return 'data:image/png;base64,'+b64.replace(/\s/g,'');
 const candidate=[obj.image_url,obj.image,obj.url,obj.data,obj.content,obj.parts,obj.output,obj.images,obj.result,obj.message];
 for(let x of candidate){if(x&&typeof x==='object'&&typeof x.url==='string')x=x.url;const found=imageFrom(x);if(found)return found;}
 return null;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const key=String(process.env.CHABOKAN_API_KEY||'').trim();
 const model=String(process.env.CHABOKAN_IMAGE_MODEL||'').trim();
 const supplied=String(process.env.CHABOKAN_IMAGE_URL||'').trim();
 // This release is intentionally restricted to the provider's official chat endpoint.
 // Never proxy an arbitrary URL from a configuration typo or client input.
 const validUrl=supplied===VALID_ENDPOINT;
 const missing=[!key&&'CHABOKAN_API_KEY',!supplied&&'CHABOKAN_IMAGE_URL',!model&&'CHABOKAN_IMAGE_MODEL'].filter(Boolean);
 if(req.method==='GET'&&req.query?.probe==='gemini')return send(res,200,{
  ok:missing.length===0&&validUrl,
  code:missing.length?'MISSING_CONFIG':validUrl?'CONFIGURED':'INVALID_ENDPOINT',
  message:missing.length?'تنظیمات سرور ناقص است: '+missing.join(', '):validUrl?'تنظیمات ثبت شده است. تولید تصویر هنوز آزمایش نشده و ممکن است هزینه داشته باشد.':'آدرس CHABOKAN_IMAGE_URL باید دقیقاً مسیر chat/completions چابکان باشد.',
  model:model||null
 });
 if(req.method!=='POST')return send(res,405,{error:'فقط درخواست POST پذیرفته می‌شود.'});
 if(missing.length)return send(res,503,{error:'تنظیمات سرور ناقص است: '+missing.join(', '),definitiveRejection:true});
 if(!validUrl)return send(res,503,{error:'CHABOKAN_IMAGE_URL باید دقیقاً https://ai.chabokan.net/v1/chat/completions باشد.',definitiveRejection:true});
 const prompt=String(req.body?.prompt||'').trim();
 if(prompt.length<30||prompt.length>3500)return send(res,400,{error:'توضیح تصویر نامعتبر است.',definitiveRejection:true});
 const ratio=req.body?.size==='story'?'2:3':'1:1';
 const payload={model,stream:false,messages:[{role:'user',content:[{type:'text',text:`Generate ONE image, ${ratio} aspect ratio. Return the generated image in the response (not a textual description). ${prompt}`}]}]};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),165000),started=Date.now();
 try{
  const upstream=await fetch(VALID_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(payload),signal:controller.signal,redirect:'error'});
  let data;try{data=await upstream.json()}catch{data=null;}
  if(!upstream.ok){const reason=data?.error?.message||data?.message||data?.error?.detail||'';
   return send(res,[400,401,402,403,404,422,429].includes(upstream.status)?upstream.status:502,{error:'خطای چابکان (HTTP '+upstream.status+'). '+safeError(reason),upstreamStatus:upstream.status,definitiveRejection:[400,401,402,403,404,422,429].includes(upstream.status)});
  }
  const message=data?.choices?.[0]?.message;
  let image=imageFrom(message?.content)||imageFrom(message?.images)||imageFrom(data?.data)||imageFrom(data?.images)||imageFrom(data?.output)||null;
  if(image)return send(res,200,{image,model,elapsedMs:Date.now()-started});
  return send(res,502,{error:'چابکان پاسخ داد ولی تصویر قابل استفاده در پاسخ نبود. ممکن است این مدل یا مسیر chat/completions در چابکان خروجی تصویر ندهد؛ پیش از درخواست دوباره، لاگ و اعتبار را بررسی کنید.',code:'NO_IMAGE_IN_RESPONSE',definitiveRejection:false});
 }catch(e){return send(res,502,{error:e?.name==='AbortError'?'زمان پاسخ تمام شد. پیش از تلاش دوباره مصرف اعتبار را بررسی کنید.':'اتصال به چابکان برقرار نشد.',definitiveRejection:false});}
 finally{clearTimeout(timer);}
}
