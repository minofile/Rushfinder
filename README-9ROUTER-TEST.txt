RushFinder — نسخه وب برای تست GPT Image 2.5 Flare در 9Router

این ZIP نسخه کامل وبسایت است. ساختار پوشه‌ها باید در ریشه ریپازیتوری GitHub حفظ شود.

فقط این فایل‌ها نسبت به نسخه اصلی تغییر کرده‌اند:
- infographic.html: ارسال تولید تصویر به API جدید /api/generate-infographic و دکمه تست تنظیمات
- api/generate-infographic.js: واسطه امن Vercel به پراکسی/تونل
- api/9router-status.js: بررسی وجود تنظیمات بدون مصرف اعتبار

فایل‌های قدیمی api/netarz-image.js و api/netarz-analyze.js تغییری نکرده‌اند.

مراحل:
۱) محتویات ZIP را در ریشه مخزن GitHub پروژه منتشر کنید (نه خود ZIP).
۲) Vercel > Project > Settings > Environment Variables، با scope=Production این سه مقدار را بسازید:
 RUSH_9ROUTER_TUNNEL_URL = آدرس HTTPS تونل cloudflared، بدون /v1
 RUSH_9ROUTER_API_KEY = API Key در صفحه Endpoint & Key برنامه 9Router
 RUSH_9ROUTER_PROXY_SECRET = متن فایل rush-proxy-token.txt از پوشه پراکسی روی ویندوز
۳) پس از اعمال متغیرها Deploy جدید انجام دهید.
۴) برنامه 9Router، node rush-proxy.js و cloudflared را روی کامپیوتر باز نگه دارید.
۵) ابتدا دکمه بررسی تنظیمات 9Router در /infographic.html را بزنید؛ سپس برای اولین ساخت تصویر آزمایش کنید.

هشدارها:
- هیچ رمز یا کلید یا rush-proxy-token.txt را در GitHub یا چت منتشر نکنید.
- آدرس Quick Tunnel موقتی است و پس از راه‌اندازی مجدد ممکن است تغییر کند.
- محدودیت پاسخ Vercel و زمان اجرای تابع، تولید تصاویر حجیم یا طولانی را ممکن است قطع کند.
- این نسخه تست عملی آنلاین/حجم پاسخ را تضمین نمی‌کند؛ اعتبار رایگان 9Router هم تضمین‌شده نیست.
- API جدید فقط بک‌گراند گرافیکی را می‌سازد؛ متن فارسی/آمار با رندرکننده خود RushFinder اضافه می‌شوند.
