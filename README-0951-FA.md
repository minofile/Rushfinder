# RushFinder 0951 — رفع مشکل Remotion (فارسی)

## علت خطای نسخه 0950
فایل `motion-studio-web/index.html` فقط یک صفحه موقت بود؛ `Remotion Player` در خود فایل ZIP کامپایل نشده بود. پس در وب، نوشته «موتور آماده نصب است» نمایش داده می‌شد؛ در نتیجه موتور واقعاً اجرا نمی‌شد. علاوه بر آن iframe در کادر بسیار کوچک پیش‌نمایش باز می‌شد.

## اصلاحات 0951
- استودیوی Remotion در پنجره بزرگ ۹۶٪ صفحه باز می‌شود، نه داخل کادر کوچک پیش‌نمایش.
- هنگام نبود نسخه کامپایل‌شده، پیغام واقعیِ آماده نبودن موتور نمایش داده می‌شود؛ نه اینکه برنامه وانمود کند اجرا شده است.
- Workflow گیت‌هاب `.github/workflows/build-remotion.yml` وابستگی‌ها را با Node 22 نصب می‌کند، TypeScript را بررسی می‌کند، Vite را Build می‌کند، فایل‌های ساخته‌شده را اعتبارسنجی و به مخزن push می‌کند.
- وقتی فایل‌های build شده به `motion-studio-web/` رسیدند و Vercel deploy شد، دکمه استودیوی Remotion باید Player واقعی را نمایش دهد.
- در این مرحله **Claude API لازم نیست.** پروژه آزمایشی فرانسه داخل Remotion وجود دارد.

## نصب
1. ZIP اصلاحیه را در پوشه اصلی GitHub پروژه RushFinder استخراج کن (فایل‌ها جایگزین شوند).
2. فقط `PUBLISH-0951-GITHUB.cmd` را اجرا کن.
3. وارد GitHub → Actions → **Build Remotion Studio** شو. **منتظر تیک سبز** این workflow باش.
4. بعد از آن در Vercel آخرین deployment باید **Ready** باشد. سایت را با Ctrl+F5 باز کن.
5. در تدوین هوشمند روی «استودیوی Remotion» کلیک کن؛ باید یک پنجره بزرگ با Remotion Player و تایم‌لاین صحنه‌ها ببینی. پخش نمونه آزمایشی بدون API امکان‌پذیر است.
6. آدرس مستقیم تست: `https://rushfinder.vercel.app/motion-studio-web/index.html`

## اگر GitHub Actions قرمز شد
روی آخرین اجرای Build Remotion Studio کلیک کن، سپس لاگ بخش قرمز را بفرست. بدون Build موفق، Player واقعی در وب وجود ندارد. ممکن است تنظیمات Repository → Settings → Actions → General → Workflow permissions برای push خروجی build به «Read and write permissions» نیاز داشته باشد.

## محدودیت‌های فعلی
- این اصلاحیه **راه‌اندازی واقعی Remotion Player** و اندازه پنجره را هدف می‌گیرد، نه تولید خودکار کیفیت سینمایی نمونه کاربر.
- MP4 Remotion هنوز باید با `RENDER-REMOTION.cmd` روی کامپیوتر از JSON ذخیره‌شده رندر شود؛ دکمه Export سایت به رندر Remotion متصل نیست.
- نصب و build npm در محیط تولید این اصلاحیه در دسترس نبود؛ کارکرد کامل روی GitHub Actions باید با تیک سبز workflow و تست روی سایت تأیید شود.
- API Keys را در ZIP یا GitHub قرار نده.
