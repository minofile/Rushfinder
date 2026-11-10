// RushFinder 0968 — AvalAI image response formats. Existing route; no extra Vercel functions.
// The private AVALAI_API_KEY is read only on the server. Never return it to the browser.
import { timingSafeEqual } from 'node:crypto';

const BASE_URL = 'https://api.avalai.ir/v1';
const DEFAULT_MODEL = 'gpt-image-2.5-flare';
const ALLOWED_MODELS = new Set([
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
  'gpt-image-2'
]);
const ALLOWED_QUALITIES = new Set(['low', 'medium', 'high']);

function secureEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return aa.length === bb.length && aa.length > 0 && timingSafeEqual(aa, bb);
}
function send(res, status, body) { return res.status(status).json(body); }
function safeError(value) {
  return String(value || 'خطای نامشخص')
    .replace(/(?:sk|aa)-[A-Za-z0-9_-]{4,}|Bearer\s+\S+/gi, '[REDACTED]').slice(0, 340);
}
function imageError(res, status, message, definitiveRejection = true, extra = {}) {
  return send(res, status, { error: message, definitiveRejection, ...extra });
}


// Different AvalAI image routes can return Base64, data URLs, or HTTPS image URLs.
// Never expose the API key, image body, or the user's prompt in diagnostic messages.
const MAX_INLINE_BASE64 = 3_900_000; // safely below typical Vercel function response limits
function imagePayload(result) {
  const candidates = [
    result?.data?.[0],
    result?.data?.image,
    result?.data,
    result?.images?.[0],
    result?.output?.[0],
    result?.result?.data?.[0],
    result?.result?.images?.[0],
    result?.result,
    result?.image,
  ];
  for (const item of candidates) {
    if (!item) continue;
    if (typeof item === 'string') {
      if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(item)) return {kind:'dataUrl', value:item};
      if (/^https:\/\//i.test(item)) return {kind:'url', value:item};
      continue;
    }
    if (typeof item !== 'object') continue;
    for (const prop of ['b64_json', 'image_base64', 'base64', 'image_base64_data']) {
      if (typeof item[prop]==='string' && item[prop].length>100) {
        return {kind:'b64', value:item[prop]};
      }
    }
    for (const prop of ['url', 'image_url', 'image']) {
      const v = typeof item[prop]==='string' ? item[prop] : item[prop]?.url;
      if (typeof v === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/i.test(v)) return {kind:'dataUrl', value:v};
      if (typeof v === 'string' && /^https:\/\//i.test(v)) return {kind:'url', value:v};
    }
  }
  return null;
}
function payloadShape(value) {
  if (!value || typeof value!=='object') return typeof value;
  const props = item=>item && typeof item==='object'
    ? Object.keys(item).slice(0,10).map(s=>s.slice(0,40)).join(', ')
    : typeof item;
  return 'root=['+props(value)+']; data[0]=['+props(value?.data?.[0])+']; result=['+props(value?.result)+']';
}
function mimeFromB64(b64) {
  return b64.startsWith('iVBOR') ? 'image/png'
    : b64.startsWith('/9j/') ? 'image/jpeg'
    : b64.startsWith('UklGR') ? 'image/webp'
    : 'image/png';
}
function asImageDataUrl(value, isDataUrl=false) {
  const raw = isDataUrl ? value : value.replace(/\s+/g,'');
  const b64 = isDataUrl ? String(raw).split(',',2)[1] : raw;
  if (typeof b64!=='string' || b64.length<100 || !/^[a-zA-Z0-9+/=]+$/.test(b64)) return null;
  if (b64.length > MAX_INLINE_BASE64) return {tooLarge:true};
  return {image:isDataUrl ? raw : 'data:'+mimeFromB64(b64)+';base64,'+b64};
}
function safeHttpsImageUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol!=='https:' || u.username || u.password || u.port || u.hostname.length>200) return null;
    if (u.hostname==='localhost' || /^[0-9.]+$/.test(u.hostname) || u.hostname.includes(':') || u.hostname.endsWith('.local')) return null;
    return u.href;
  } catch {return null;}
}
// Optional exact HTTPS media hostnames configured privately in Vercel, not in browser code.
// Example: RF_IMAGE_ALLOWED_HOSTS=images.example-cdn.com,storage.example-cdn.com
// Do NOT use wildcard or broad suffix entries here. Never accept the client URL alone as authorization.
function configuredImageHosts() {
  return new Set(String(process.env.RF_IMAGE_ALLOWED_HOSTS || '').split(',')
    .map(h=>h.trim().toLowerCase()).filter(h=>/^(?=.{4,200}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(h)));
}
function safeRemoteHost(url) {
  const h = new URL(url).hostname.toLowerCase();
  return h==='storage.googleapis.com' || h.endsWith('.storage.googleapis.com') ||
    h.endsWith('.blob.core.windows.net') || h==='files.oaiusercontent.com' ||
    h.endsWith('.oaiusercontent.com') || h==='avalai.ir' || h.endsWith('.avalai.ir') ||
    h==='image-proxy-worker.gnbellosc.workers.dev' ||
    configuredImageHosts().has(h);
}
function explainRejectedHost(url) {
  let h='ناشناخته';
  try { h=new URL(url).hostname.toLowerCase().slice(0,200); } catch {}
  return 'میزبان فایل تصویر مجاز نیست: '+h+'. برای بازیابی رایگان، فقط نام همین میزبان را در متغیر RF_IMAGE_ALLOWED_HOSTS پروژه Vercel ثبت کن و Deploy بگیر. از ساخت مجدد تصویر خودداری کن.';
}
async function tryFetchImageUrl(url, signal) {
  // Only access vetted storage endpoints, and never follow redirects (SSRF defense).
  if (!safeRemoteHost(url)) return null;
  try {
    const r=await fetch(url, {method:'GET',signal,redirect:'error',headers:{Accept:'image/png,image/jpeg,image/webp'}});
    if (!r.ok || !/^image\/(png|jpeg|webp)(?:;|$)/i.test(r.headers.get('content-type')||'')) return null;
    const declared=Number(r.headers.get('content-length')||0);
    if (declared>2_900_000) return null;
    const reader=r.body?.getReader();
    if (!reader) return null;
    const parts=[];let total=0;
    while(true){
      const {value,done}=await reader.read();if(done)break;
      total+=value.byteLength;
      if(total>2_900_000){await reader.cancel();return null;}
      parts.push(value);
    }
    const data=Buffer.concat(parts.map(p=>Buffer.from(p)),total);
    if (!data.length) return null;
    const mime=(r.headers.get('content-type')||'image/png').split(';')[0].toLowerCase();
    return {image:'data:'+mime+';base64,'+data.toString('base64')};
  } catch {return null;}
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = String(process.env.AVALAI_API_KEY || '').trim();
  const accessCode = String(process.env.RF_INFO_ACCESS_CODE || '').trim();
  if (!key || !accessCode) {
    return imageError(res, 503, 'تنظیمات Vercel ناقص است: ' + [!key && 'AVALAI_API_KEY', !accessCode && 'RF_INFO_ACCESS_CODE'].filter(Boolean).join(', '));
  }
  if (!secureEqual(req.headers['x-rushfinder-info-code'], accessCode)) {
    return imageError(res, 403, 'کد دسترسی مدیر اشتباه است؛ این کد با کلید AvalAI فرق دارد.');
  }
  // Same-origin recovery proxy for an ALREADY GENERATED image URL.
  // Never calls /images/generations; it only downloads existing image bytes.
  if (req.method === 'GET' && req.query?.recover === 'image') {
    const remote = safeHttpsImageUrl(String(req.query?.url || ''));
    if (!remote || !safeRemoteHost(remote)) {
      return imageError(res, 400, remote ? explainRejectedHost(remote) : 'آدرس HTTPS تصویر نامعتبر است؛ ساخت مجدد نزن.', false);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const upstream = await fetch(remote, {
        method:'GET',signal:controller.signal,redirect:'error',
        headers:{Accept:'image/png,image/jpeg,image/webp,*/*'}
      });
      if (!upstream.ok) return imageError(res, 502, 'فایل تصویر در میزبان AvalAI قابل دریافت نیست (HTTP '+upstream.status+'). ساخت دوباره نزن.', false);
      const rawType = String(upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      // Some signed download endpoints use application/octet-stream.
      if (!['image/png','image/jpeg','image/webp','application/octet-stream'].includes(rawType)) {
        return imageError(res, 502, 'پاسخ لینک تصویر، فایل تصویری معتبر نیست.', false);
      }
      const maxBytes = 3_700_000; // Stay below Vercel's function payload ceiling.
      const reader = upstream.body?.getReader();
      if (!reader) return imageError(res,502,'بدنه فایل تصویر در دسترس نیست.',false);
      let total=0,parts=[];
      for(;;){
        const {done,value} = await reader.read();
        if(done)break;
        total+=value.byteLength;
        if(total>maxBytes){await reader.cancel();return imageError(res,413,'حجم تصویر برای پروکسی Vercel بیش از حد است؛ از لینک اصلی بازیابی کن، ساخت جدید نزن.',false);}
        parts.push(Buffer.from(value));
      }
      const bytes=Buffer.concat(parts,total);
      if(bytes.length<100) return imageError(res,502,'فایل تصویر ناقص است.',false);
      let mime;
      if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
      else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';
      else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')mime='image/webp';
      else return imageError(res,502,'محتوای لینک، تصویر PNG/JPEG/WebP نیست.',false);
      res.setHeader('Content-Type',mime);
      res.setHeader('Cache-Control','private, no-store');
      res.setHeader('X-Content-Type-Options','nosniff');
      return res.status(200).send(bytes);
    } catch (e) {
      return imageError(res,502, e?.name==='AbortError' ? 'مهلت دانلود تصویر قبلی تمام شد؛ ساخت جدید نزن.' : 'دانلود تصویر قبلی از میزبان فایل ناموفق بود؛ ساخت جدید نزن.',false);
    } finally {clearTimeout(timer);}
  }
  if (req.method === 'GET' && req.query?.probe === 'avalai') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      // Free authentication check. A successful /models response does not guarantee paid image access.
      const upstream = await fetch(BASE_URL + '/models', {
        method:'GET',
        headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
        signal: controller.signal,
        redirect: 'error'
      });
      if (!upstream.ok) {
        let d; try { d=await upstream.json(); } catch { d=null; }
        return imageError(res, [401,403,429].includes(upstream.status) ? upstream.status : 502,
          'بررسی اتصال AvalAI ناموفق بود (HTTP '+upstream.status+'): ' + safeError(d?.error?.message || d?.message));
      }
      return send(res, 200, {ok:true, provider:'avalai', model:DEFAULT_MODEL,
        message:'کلید AvalAI معتبر است. این تست تصویر نمی‌سازد و دسترسی مدل تصویر را تضمین نمی‌کند.'});
    } catch(e) {
      return imageError(res, 502, e?.name==='AbortError' ? 'مهلت بررسی اتصال AvalAI تمام شد.' : 'ارتباط Vercel با AvalAI برقرار نشد.');
    } finally { clearTimeout(timer); }
  }
  if (req.method !== 'POST') return imageError(res, 405, 'فقط POST و بررسی اتصال پشتیبانی می‌شوند.');
  if (req.body?.provider && req.body.provider !== 'avalai') {
    return imageError(res, 400, 'صفحه قدیمی است؛ Ctrl+F5 بزن تا نسخه AvalAI بارگذاری شود.');
  }
  const prompt = String(req.body?.prompt || '').trim();
  const model = String(req.body?.model || DEFAULT_MODEL).trim();
  const quality = String(req.body?.quality || 'low');
  const size = req.body?.size==='story' ? '1024x1536' : '1024x1024';
  if (prompt.length < 30 || prompt.length > 3500) return imageError(res, 400, 'متن باید بین ۳۰ تا ۳۵۰۰ نویسه باشد.');
  if (!ALLOWED_MODELS.has(model)) return imageError(res, 400, 'مدل نامعتبر است. صفحه را با Ctrl+F5 تازه‌سازی کن.');
  if (!ALLOWED_QUALITIES.has(quality)) return imageError(res, 400, 'کیفیت نامعتبر است.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 165000);
  const started = Date.now();
  try {
    const upstream = await fetch(BASE_URL + '/images/generations', {
      method: 'POST',
      headers: {Authorization:'Bearer ' + key, 'Content-Type':'application/json', Accept:'application/json'},
      body: JSON.stringify({model, prompt, size, quality, n:1, output_format:'webp'}),
      signal:controller.signal,
      redirect:'error'
    });
    let result; try { result=await upstream.json(); } catch { result=null; }
    if (!upstream.ok) {
      const raw = result?.error?.message || result?.message || result?.error?.detail || '';
      const definitive = [400,401,402,403,404,422,429].includes(upstream.status);
      const hint = upstream.status===403 ? ' سطح دسترسی کلید یا مجوز استفاده از این مدل در حساب AvalAI را بررسی کن.' : '';
      const retry = Number(upstream.headers.get('retry-after'));
      const retryAfterSeconds = Number.isFinite(retry) && retry>0 && retry<100000 ? retry : undefined;
      return imageError(res, definitive?upstream.status:502,
        'خطای AvalAI (HTTP '+upstream.status+'): '+safeError(raw)+hint, definitive,
        retryAfterSeconds ? {retryAfterSeconds} : {});
    }
    const providerRequestId = String(upstream.headers.get('x-request-id') || upstream.headers.get('x-avalai-request-id') || '').slice(0,100);
    // HTTP 200 is not proof that an image is available. Some providers send a
    // JSON error/status body with 200; never silently re-issue a paid request.
    const candidate = imagePayload(result);
    if (!candidate) {
      const msg = safeError(result?.error?.message || result?.message || '');
      return imageError(res, 502,
        'پاسخ موفق HTTP از AvalAI دریافت شد ولی محتوای تصویر در آن نیست. '+
        (msg ? 'پیام سرویس: '+msg+'؛ ' : '')+
        'ساخت دوباره نزن؛ مصرف را بررسی کن. ساختار پاسخ: '+payloadShape(result), false,
        providerRequestId ? {providerRequestId} : {});
    }
    if (candidate.kind==='b64' || candidate.kind==='dataUrl') {
      const payload=asImageDataUrl(candidate.value,candidate.kind==='dataUrl');
      if (payload?.image) {
        return send(res,200,{image:payload.image,provider:'avalai',model,elapsedMs:Date.now()-started});
      }
      return imageError(res,502,payload?.tooLarge
        ? 'تصویر برگشته ولی حجم Base64 برای پاسخ Vercel زیاد است؛ ساخت مجدد نزن و مصرف AvalAI را بررسی کن.'
        : 'داده تصویر AvalAI ناقص یا نامعتبر است؛ ساخت مجدد نزن. '+payloadShape(result),false,
        providerRequestId?{providerRequestId}:{});
    }
    const url=safeHttpsImageUrl(candidate.value);
    if(!url){return imageError(res,502,'AvalAI آدرس تصویری غیرقابل استفاده برگشت داده؛ ساخت دوباره نزن.',false);}
    const inline=await tryFetchImageUrl(url,controller.signal);
    if (inline?.image) return send(res,200,{image:inline.image,provider:'avalai',model,elapsedMs:Date.now()-started});
    // Fallback: return the provider's HTTPS image URL, rather than discarding a
    // potentially paid result. Client uses anonymous CORS for Canvas export.
    return send(res,200,{image:url,remoteImage:true,provider:'avalai',model,elapsedMs:Date.now()-started});
  } catch(e) {
    return imageError(res, 502,
      e?.name==='AbortError' ? 'زمان انتظار ساخت تصویر تمام شد؛ مصرف AvalAI را بررسی کن.' : 'ارتباط Vercel و AvalAI قطع شد؛ برای پیشگیری از هزینه دوباره مصرف را بررسی کن.', false);
  } finally { clearTimeout(timer); }
}
