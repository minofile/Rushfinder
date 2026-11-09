// RushFinder 0963: replace the old Chabokan image provider with Gisoo.
// Keep this existing Vercel route name to avoid adding another serverless function.
// Secret keys are read only from Vercel environment variables.
import { timingSafeEqual } from 'node:crypto';

const DEFAULT_BASE_URL = 'https://gisoo.pro/api/v1';
// The user's Gisoo API key explicitly allows the direct-provider GPT Image 2.5 Flare.
// Never silently substitute another paid model when a cached browser submits 2.6.
const MODEL_ID = 'gpt-image-2.5-flare';
const ALLOWED_QUALITIES = new Set(['low', 'medium', 'high']);

function secureEqual(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  return aa.length === bb.length && aa.length > 0 && timingSafeEqual(aa, bb);
}
function send(res, status, body) { return res.status(status).json(body); }
function safeError(value) {
  return String(value || 'خطای نامشخص').replace(/sk-[A-Za-z0-9_-]+|Bearer\s+\S+/gi, '[REDACTED]').slice(0, 240);
}
function getBaseUrl() {
  const raw = String(process.env.GISOO_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  // Only allow the two documented Gisoo API hosts; never proxy a caller-supplied URL.
  if (raw !== 'https://gisoo.pro/api/v1' && raw !== 'https://ir.gisoo.pro/api/v1') return DEFAULT_BASE_URL;
  return raw;
}
function imageError(res, status, message, definitiveRejection = true) {
  return send(res, status, { error: message, definitiveRejection });
}

async function handleGisoo(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = String(process.env.GISOO_API_KEY || '').trim();
  const accessCode = String(process.env.RF_INFO_ACCESS_CODE || '').trim();
  if (!key || !accessCode) {
    return imageError(res, 503, 'تنظیمات Vercel ناقص است: ' + [!key && 'GISOO_API_KEY', !accessCode && 'RF_INFO_ACCESS_CODE'].filter(Boolean).join(', '));
  }
  if (!secureEqual(req.headers['x-rushfinder-info-code'], accessCode)) {
    return imageError(res, 403, 'کد دسترسی مدیر صحیح نیست. این کد با API Key گیسو فرق دارد.');
  }
  const baseUrl = getBaseUrl();
  if (req.method === 'GET' && req.query?.probe === 'gisoo') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const upstream = await fetch(baseUrl + '/models?type=image', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + key, 'Accept': 'application/json' },
        signal: controller.signal,
        redirect: 'error'
      });
      let catalogue; try { catalogue = await upstream.json(); } catch { catalogue = null; }
      if (!upstream.ok) {
        const raw = catalogue?.error?.message || catalogue?.message || '';
        return imageError(res, [401, 403, 429].includes(upstream.status) ? upstream.status : 502,
          'بررسی اتصال گیسو ناموفق بود (HTTP ' + upstream.status + '): ' + safeError(raw));
      }
      const modelText = JSON.stringify(catalogue || {});
      return send(res, 200, {
        ok: true,
        code: 'GISOO_CONNECTED',
        baseUrl,
        model: MODEL_ID,
        modelListed: modelText.includes(MODEL_ID),
        message: 'اتصال گیسو برقرار است؛ این تست مجوز ساخت تصویر را تأیید نمی‌کند و هیچ تصویر پولی ساخته نشده است.'
      });
    } catch (error) {
      return imageError(res, 502, error?.name === 'AbortError' ? 'مهلت بررسی اتصال گیسو تمام شد.' : 'ارتباط با گیسو برقرار نشد. نشانی GISOO_BASE_URL را بررسی کنید.');
    } finally { clearTimeout(timer); }
  }
  if (req.method !== 'POST') return imageError(res, 405, 'فقط درخواست POST پذیرفته می‌شود.');

  const prompt = String(req.body?.prompt || '').trim();
  const requestedModel = String(req.body?.model || MODEL_ID).trim();
  const model = requestedModel === MODEL_ID ? MODEL_ID : null;
  const quality = String(req.body?.quality || 'medium');
  const size = req.body?.size === 'story' ? '1024x1536' : '1024x1024';
  if (prompt.length < 30 || prompt.length > 3500) return imageError(res, 400, 'متن توضیح تصویر باید بین ۳۰ تا ۳۵۰۰ نویسه باشد.');
  if (!model) return imageError(res, 400, 'مدل انتخاب‌شده مربوط به نسخه قبلی صفحه است. صفحه اینفو را با Ctrl+F5 تازه‌سازی کنید. تنها مدل فعال GPT Image 2.5 Flare است.');
  if (!ALLOWED_QUALITIES.has(quality)) return imageError(res, 400, 'کیفیت انتخاب‌شده معتبر نیست.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 165000);
  const started = Date.now();
  try {
    // Gisoo documents POST /images/generations and returns data[0].b64_json.
    const payload = { model, prompt, size, quality, n: 1, output_format: 'webp' };
    const upstream = await fetch(baseUrl + '/images/generations', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: 'error'
    });
    let result; try { result = await upstream.json(); } catch { result = null; }
    if (!upstream.ok) {
      const status = upstream.status;
      const raw = result?.error?.message || result?.message || result?.error?.detail || '';
      const code = String(result?.error?.code || result?.code || '');
      const permissionHint = status === 403 && (code === 'model_not_allowed' || String(raw).includes('اجازهٔ استفاده از مدل'))
        ? ' کلید یا پروژه گیسو مجوز این مدل را ندارد؛ در پنل API گیسو بخش مدل‌های مجاز (allowed_models) را بررسی و مدل کامل ' + model + ' را مجاز کنید.'
        : '';
      const definitive = [400, 401, 402, 403, 404, 422, 429].includes(status);
      return imageError(res, definitive ? status : 502, 'خطای گیسو (HTTP ' + status + '): ' + safeError(raw) + permissionHint, definitive);
    }
    const b64 = result?.data?.[0]?.b64_json;
    if (typeof b64 !== 'string' || b64.length < 100) {
      return imageError(res, 502, 'گیسو پاسخ داد، اما دادهٔ تصویر در data[0].b64_json پیدا نشد. پیش از تلاش دوباره گزارش مصرف گیسو را بررسی کنید.', false);
    }
    // Keep the JSON response below typical serverless response-size limits.
    if (b64.length > 5_000_000) {
      return imageError(res, 502, 'تصویر ساخته شده اما پاسخ برای انتقال از Vercel بیش از حد بزرگ است؛ درخواست را تکرار نکنید و مصرف گیسو را بررسی کنید.', false);
    }
    return send(res, 200, { image: 'data:image/webp;base64,' + b64, model, provider: 'gisoo', elapsedMs: Date.now() - started });
  } catch (error) {
    return imageError(res, 502, error?.name === 'AbortError' ? 'زمان ساخت تصویر تمام شد. پیش از تلاش دوباره گزارش مصرف گیسو را بررسی کنید.' : 'اتصال به API تصویر گیسو برقرار نشد. پیش از تلاش دوباره گزارش مصرف را بررسی کنید.', false);
  } finally { clearTimeout(timer); }
}

export default async function handler(req, res) {
  return handleGisoo(req, res);
}
