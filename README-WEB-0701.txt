RushFinder Web 0701 — اتصال مستقیم نت‌ارز

1) محتوای این ZIP را در ریشه مخزن GitHub پروژه جایگزین کنید (خود ZIP را آپلود نکنید).
2) پوشه api فقط باید 12 فایل JavaScript داشته باشد. فایل‌های generate-infographic.js و 9router-status.js را اگر در مخزن هستند حذف کنید.
3) در Vercel > Settings > Environment Variables، متغیر Secret با نام NETARZ_API_KEY را برای Production تنظیم کنید. کلید را در GitHub قرار ندهید.
4) پس از Push و Ready شدن Deployment، این لینک را باز کنید: https://rushfinder.vercel.app/api/netarz-image?probe=netarz
5) CONFIGURED تنها وجود کلید را تأیید می‌کند، نه اعتبار یا اتصال واقعی.
6) قبل از اولین ساخت تصویر، موجودی نت‌ارز را بررسی کنید. کیفیت اولیه medium است و هر درخواست می‌تواند هزینه داشته باشد.
7) 9Router، تونل و CMD دیگر برای این نسخه نیاز نیستند.
8) محدودیت حجم/زمان پاسخ در Vercel ممکن است برای تصاویر بزرگ مشکل ایجاد کند؛ خطا را قبل از تکرار درخواست بررسی کنید.

این بسته براساس RushFinder Web 0700 ساخته شده، و مسیر تحلیل قدیمی پروژه از نسخه اصلی بازگردانده شده است.
