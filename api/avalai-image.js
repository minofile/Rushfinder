// RushFinder 0967 — AvalAI image generation. Existing route; no extra Vercel functions.
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
    const img = result?.data?.[0];
    const b64 = img?.b64_json;
    if (typeof b64!=='string' || b64.length<100) {
      return imageError(res, 502, 'AvalAI پاسخ داد، اما تصویر base64 دریافت نشد. قبل از تلاش دوباره مصرف API را بررسی کن.', false);
    }
    if (b64.length > 5_000_000) {
      return imageError(res, 502, 'تصویر ساخته شد ولی برای پاسخ Vercel بزرگ است. دوباره درخواست نده؛ ابتدا مصرف AvalAI را بررسی کن.', false);
    }
    const mime = b64.startsWith('iVBOR') ? 'image/png' : b64.startsWith('/9j/') ? 'image/jpeg' : b64.startsWith('UklGR') ? 'image/webp' : 'image/webp';
    return send(res, 200, {image:'data:'+mime+';base64,'+b64, provider:'avalai',model,elapsedMs:Date.now()-started});
  } catch(e) {
    return imageError(res, 502,
      e?.name==='AbortError' ? 'زمان انتظار ساخت تصویر تمام شد؛ مصرف AvalAI را بررسی کن.' : 'ارتباط Vercel و AvalAI قطع شد؛ برای پیشگیری از هزینه دوباره مصرف را بررسی کن.', false);
  } finally { clearTimeout(timer); }
}
