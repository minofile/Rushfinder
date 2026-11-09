RushFinder 0952 - حذف گزینه Remotion Studio

این اصلاحیه فقط رابط کاربری معیوب Remotion Studio را از صفحه smart-edit.html حذف می‌کند:
- دکمه Remotion Studio در کنار نسبت تصویر
- iframe پنهان مربوط به آن
- فایل اسکریپت اتصال Remotion در این صفحه
- CSS اختصاصی همین دکمه/پنجره

تایم‌لاین، نمایش ویدئو، ابزارهای فعلی و اتصال Groq/Claude تغییر نمی‌کنند.
این اصلاحیه Remotion را تعمیر یا نصب نمی‌کند و صرفاً گزینه اضافی را حذف می‌کند.

روش اجرا:
۱. سه فایل داخل ZIP را در ریشه همان پوشه محلی RushFinder که به GitHub متصل است استخراج کنید.
۲. PUBLISH-0952-REMOVE-REMOTION.cmd را اجرا کنید.
۳. اگر پیام SUCCESS مشاهده شد، پس از Ready شدن Vercel سایت را Ctrl+F5 کنید.

فایل بک‌آپ: smart-edit.html.before-remove-remotion.bak
اگر Git ندارید، فقط فایل HTML محلی اصلاح شده؛ Push به GitHub انجام نمی‌شود.
این اسکریپت فقط smart-edit.html را Stage و Commit می‌کند و به API، کلیدها و Remotion Build دست نمی‌زند.
