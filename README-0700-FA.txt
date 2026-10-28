RushFinder Web 0700 — نسخه آزمایشی اتصال اینفو به 9Router

این بسته نسخه کامل وب و شامل index.html، infographic.html، پوشه api و دارایی‌ها است.
تعداد فایل‌های تابع داخل پوشه api برابر با 12 است؛ دو تابع اضافی generate-infographic.js و 9router-status.js وجود ندارند.

راهنمای انتشار:
1) ابتدا از ریپوی GitHub نسخه پشتیبان بگیرید.
2) محتویات داخل این ZIP (نه خود پوشه) را در ریشه مخزن GitHub جایگزین کنید و Commit بزنید.
3) در Vercel متغیرهای Production زیر را حفظ کنید:
   RUSH_9ROUTER_TUNNEL_URL = آدرس HTTPS تونل Cloudflare بدون /v1
   RUSH_9ROUTER_API_KEY = کلید محرمانه 9Router
   RUSH_9ROUTER_PROXY_SECRET = محتوای rush-proxy-token.txt
4) پراکسی Node روی پورت 3010، cloudflared و 9Router را باز نگه دارید.
5) پس از Deploy، صفحه /infographic.html را باز کنید و اول دکمه بررسی اتصال (بدون هزینه) را بزنید.

محدودیت: دکمه بررسی فقط تنظیم متغیرهای Vercel را تأیید می‌کند، نه ساخت واقعی عکس.
تولید تصویر ممکن است به علت محدودیت زمان/حجم پاسخ Vercel ناموفق باشد.
هیچ فایل حاوی کلید محرمانه یا توکن را در GitHub آپلود نکنید.
