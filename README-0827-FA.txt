RushFinder Web 0827 - سازگاری اسکریپت «تگ نام و سمت» با After Effects 2025

رفع خطای واقعی در نسخه 0826:
  Function: String().replace().trim is undefined | JSX line 77

علت: تابع String.prototype.trim در ExtendScript (موتور اسکریپت قدیمی After Effects) پشتیبانی نمی‌شود.
اصلاح: نرمال‌کردن متن با دو دستور replace و عبارت منظمِ سازگار با ExtendScript انجام می‌شود.

فقط مسیر ساخت «تگ نام و سمت»، نشانگر نسخه این قابلیت در وب، و راه‌انداز تغییر کرده‌اند.
تگ «نام خبرنگار»، تگ کانال، درصد تگ کانال، فایل‌های AEP و پورت 18826 تغییر نکرده‌اند.

نصب:
۱. از پوشه C:\Users\m_rajabi\Documents\GitHub\Rushfinder پشتیبان بگیرید.
۲. محتویات فایل ZIP را در همین پوشه اصلی جایگزین کنید؛ پوشه .git را حذف نکنید.
۳. اگر لازم است تغییرات روی سایت منتشر شوند، در GitHub Desktop دکمه Commit و Push origin را بزنید.
۴. موتور قبلی را متوقف کنید و Start-RushFinder.cmd را از پوشه اصلی اجرا کنید.
۵. در http://127.0.0.1:18826/ae-api/check این مقدار باید باشد:
  "roleBuild":"0827-role-extendscript-trim-fix"
۶. یک بار «تگ نام و سمت» را بسازید. اگر بعد از تغییر متن مرحله جدیدی خطا داد، Get-Role-Render-Log.cmd را اجرا و گزارش را ارسال کنید.

توجه: این نسخه روی شبیه‌ساز کد ExtendScript بدون trim آزمایش شده اما رندر واقعی با نسخه ویندوزی Adobe After Effects در این محیط قابل انجام نیست.
