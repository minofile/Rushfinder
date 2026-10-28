// RushFinder 0703 — Netarz image provider, longer controlled timeout and safe diagnostics.
// No image generation request is made by GET (the probe only checks configuration).
export const maxDuration = 300;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.query?.probe === 'netarz') {
    const configured = Boolean(process.env.NETARZ_API_KEY?.trim());
    return res.status(200).json({ok: configured, code: configured ? 'CONFIGURED' : 'MISSING_KEY', message: configured ? 'کلید نت‌ارز در Vercel ثبت شده؛ تولید تصویر هنوز آزمایش نشده است.' : 'متغیر NETARZ_API_KEY در Vercel وجود ندارد.'});
  }
  if (req.method !== 'POST') return res.status(405).json({error:'فقط درخواست POST پذیرفته می‌شود.'});
  const key = process.env.NETARZ_API_KEY?.trim();
  if (!key) return res.status(503).json({error:'متغیر NETARZ_API_KEY در Vercel ثبت نشده است.'});
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (prompt.length < 30 || prompt.length > 3500) return res.status(400).json({error:'توضیح تصویر باید بین ۳۰ تا ۳۵۰۰ کاراکتر باشد.'});
  const size = req.body?.size === 'story' ? '1024x1536' : '1024x1024';
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
  const elapsedMs = () => Date.now() - startedAt;
  try {
    const upstream = await fetch('https://netarz.ir/api/ai/v1/images/generations', {
      method:'POST',
      headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({model:'gpt-image-2.5-flare',prompt,size,quality:'medium',n:1}),
      signal:controller.signal,
      redirect:'error'
    });
    if (!upstream.ok) {
      let description = '';
      try {
        const raw = await upstream.json();
        description = String(raw?.error?.message || raw?.message || raw?.error?.code || '').slice(0,180);
      } catch {}
      if (upstream.status === 401) return res.status(401).json({error:'کلید API نت‌ارز معتبر نیست یا دسترسی ندارد.'});
      if (upstream.status === 402) return res.status(402).json({error:'موجودی نت‌ارز برای رزرو هزینه این تصویر کافی نیست.'});
      if (upstream.status === 429) return res.status(429).json({error:'محدودیت تعداد درخواست یا سهمیه نت‌ارز فعال شده است.',stage:'provider_rejected',elapsedMs:elapsedMs()});
      return res.status(502).json({error:'نت‌ارز پاسخ ناموفق داد (HTTP '+upstream.status+'). '+description,stage:'provider_rejected',elapsedMs:elapsedMs()});
    }
    const data = await upstream.json();
    const first = data?.data?.[0];
    const b64 = first?.b64_json;
    if (typeof b64 !== 'string' || !b64.length) return res.status(502).json({error:'پاسخ نت‌ارز فاقد تصویر Base64 بود.',stage:'invalid_provider_response',elapsedMs:elapsedMs()});
    // Vercel Functions responses have a size cap. Be explicit instead of sending a truncated image.
    if (Buffer.byteLength(b64,'utf8') > 4_200_000) return res.status(502).json({error:'نت‌ارز تصویر را تحویل داد اما حجم Base64 برای پاسخ Vercel زیاد است. درخواست را دوباره نفرست؛ احتمالاً هزینه ثبت شده است.',stage:'image_too_large',elapsedMs:elapsedMs()});
    return res.status(200).json({image:'data:image/png;base64,' + b64, model:'gpt-image-2.5-flare',elapsedMs:elapsedMs()});
  } catch (err) {
    const isTimeout = err?.name === 'AbortError';
    console.error('[netarz-image] request failed', {stage:isTimeout?'upstream_timeout':'network_or_parse', elapsedMs:elapsedMs(), name:err?.name, cause:err?.cause?.code||null});
    return res.status(502).json({error:isTimeout ? 'نت‌ارز پس از ۲۴۰ ثانیه پاسخ نداد. ممکن است اعتبار مصرف شده باشد؛ پیش از تلاش مجدد مصرف نت‌ارز را بررسی کن.' : 'پاسخ نت‌ارز دریافت یا خوانده نشد؛ قبل از تکرار وضعیت مصرف را بررسی کن.',stage:isTimeout?'upstream_timeout':'network_or_parse',elapsedMs:elapsedMs()});
  } finally {clearTimeout(timeout);}
}
