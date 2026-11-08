# RushFinder 0921 — رفع مشکل انتشار در Vercel Hobby

این نسخه بر اساس پروژه کامل RushFinder 0920 آماده شده است. مشکل موجود، 14 فایل تابع در پوشه api است؛ پلن Hobby برای پروژه‌های بدون فریم‌ورک حداکثر 12 تابع را در هر Deployment می‌پذیرد.

## تغییرات
- سه تابع قبلی `api/audius-download.js`، `api/music-download.js` و `api/appwrite-music.js` بدون تغییر در منطق داخلی در `api/combined-music.js` تجمیع شده‌اند.
- `vercel.json` سه Rewrite دارد تا آدرس‌های قدیمی `/api/audius-download`، `/api/music-download` و `/api/appwrite-music` همچنان کار کنند.
- تعداد فایل‌های تابع در api اکنون **12** است. هیچ API از نظر کاربرد حذف نشده است.
- تمام صفحات سایت، از جمله `index.html` و `smart-edit.html`، بدون تغییر نسبت به نسخه 0920 هستند.

## نصب در GitHub — حتماً حذف فایل‌های قدیمی
1. ZIP کامل 0921 را استخراج کن.
2. فایل‌های پروژه را در ریشه مخزن RushFinder جایگزین کن.
3. سه فایل قدیمی زیر را در GitHub **حذف کن** (در نسخه جدید عمداً وجود ندارند):
   - `api/audius-download.js`
   - `api/music-download.js`
   - `api/appwrite-music.js`
4. فایل `api/combined-music.js` را اضافه و `vercel.json` را جایگزین کن.
5. `Commit` و `Push` کن.
6. وضعیت Deployment در Vercel را ببین. بعد از `Ready` شدن، به سایت برو و گزینه «تدوین» و قابلیت‌های موسیقی را تست کن.

فایل ZIP کم‌حجم فقط فایل‌های جدید/اصلاح‌شده را دارد؛ حذف سه فایل قدیمی را جداگانه باید در GitHub انجام بدهی.

## وضعیت تست
ZIP و کد JavaScript و سه مسیر داخلی تابع با تست شبیه‌سازی‌شده بررسی شدند. Deploy واقعی در Vercel و پاسخ‌های زنده APIها هنوز تست نشده‌اند.
