RushFinder Web 0825 — اصلاح نمایش اشتباه «موتور 0823 نصب کنید»

علت قطعی در کد نسخه 0824:
- موتور سالم نسخه 0824 در /ae-api/check مقدار roleBuild = 0824-role-eval-watchdog را برمی‌گرداند.
- صفحه وب هنوز فقط roleBuild = 0823-role-render-diagnostics را قبول می‌کرد و گزینه نام و سمت را بی‌دلیل رد می‌کرد.

تغییرات 0825:
1. بررسی نسخه موتور در هر دو فایل index.html و news-tag.html با خروجی واقعی موتور 0824 هماهنگ شد.
2. پیام‌های قدیمی 0823 و لینک‌های کش‌شده وب به شناسه وب 0825 تغییر کردند.
3. Start-RushFinder.ps1 صفحه جدید را با ?v=0825 باز می‌کند.
4. کد موتور ae-auto-server.js، فایل AEP، تگ خبرنگار، تگ کانال و تنظیم درصد تگ کانال هیچ تغییری نکرده‌اند.

نصب:
- از پروژه اصلی نسخه پشتیبان بگیر.
- محتویات ZIP را در C:\Users\m_rajabi\Documents\GitHub\Rushfinder جایگزین کن و .git را پاک نکن.
- GitHub Desktop: Commit و Push.
- موتور قبلی RushFinder را ببند و از پوشه اصلی Start-RushFinder.cmd را اجرا کن.
- http://127.0.0.1:18826/ae-api/check را باز کن؛ roleBuild باید 0824-role-eval-watchdog و roleTag برابر true باشد.
- صفحه http://127.0.0.1:18826/index.html?v=0825 را با Ctrl+Shift+R تازه کن.

این بسته ناسازگاریِ تشخیص نسخه را اصلاح می‌کند؛ موفقیت رندر واقعی قالب تگ نام و سمت در After Effects هنوز تأیید نشده است.
اگر پس از اصلاح نسخه، رندر شکست خورد، Get-Role-Render-Log.cmd را اجرا و گزارش را ارسال کن.
