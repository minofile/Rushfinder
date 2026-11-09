/* RushFinder 0955 — streamlined Hermes editor. No credentials are shipped in JS. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const root=$('autoTab'),panel=$('rfHermesPanel'),legacy=$('rfHermesLegacy'),old=$('rfHermesLegacyContent');
 if(!root||!panel||!legacy||!old)return;
 // Keep legacy editors functional, but collapsed until explicitly requested.
 for(const el of [...root.children])if(el!==panel&&el!==legacy)old.appendChild(el);
 const projectControls=document.querySelector('.inspector .project-controls');
 if(projectControls){const acc=document.createElement('details');acc.className='rf-project-accordion';const summary=document.createElement('summary');summary.textContent='تنظیمات پروژه و کادر خروجی';acc.appendChild(summary);projectControls.parentNode.insertBefore(acc,projectControls);acc.appendChild(projectControls)}
 const trackToggle=document.createElement('label');trackToggle.style.cssText='display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:#44688d';
 const check=document.createElement('input');check.type='checkbox';check.style.width='auto';check.onchange=()=>document.body.classList.toggle('rf-show-legacy-tracks',check.checked);trackToggle.append(check,document.createTextNode('نمایش ردیف ترنزیشن در تایم‌لاین'));old.prepend(trackToggle);
 const aiTab=document.querySelector('[data-tab="auto"]');if(aiTab)aiTab.textContent='✦ Hermes';
 const info=$('rfHermesAudioInfo'),file=$('rfHermesAudio'),btn=$('rfHermesSubmit'),s=$('rfHermesStatus'),live=$('rfHermesLive'),imp=$('rfHermesImport'),previous=$('rfHermesResume');
 let busy=false,active=null,result=null,lastImported='';let poller=null;
 function status(text,bad=false){s.textContent=text;s.style.color=bad?'#a93146':'#315c8b';s.style.background=bad?'#fff0f1':'#eaf1fc'}
 function access(){return $('rfHermesAccessCode').value.trim()||sessionStorage.getItem('rfHermesAccess')||''}
 function token(){let v=sessionStorage.getItem('rfHermesSessionToken');if(!v){v=crypto.randomUUID()+crypto.randomUUID();sessionStorage.setItem('rfHermesSessionToken',v)}return v}
 async function post(data){const response=await fetch('/api/hermes',{method:'POST',headers:{'Content-Type':'application/json','X-RF-Access-Code':access()},body:JSON.stringify({...data,client_token:token()})});const r=await response.json().catch(()=>({}));if(!response.ok)throw Error(r.error||'خطای سرور Hermes ('+response.status+')');return r}
 function stopPoll(){if(poller)clearInterval(poller);poller=null}
 async function checkHealth(){try{const r=await fetch('/api/hermes',{cache:'no-store'});const d=await r.json();if(!d.configured){live.textContent='نیازمند اتصال مدیر سایت';live.classList.remove('is-ready');return}live.textContent=d.online?'Hermes آنلاین':'سیستم Hermes آفلاین';live.classList.toggle('is-ready',!!d.online)}catch{live.textContent='ارتباط نامشخص';live.classList.remove('is-ready')}}
 file.onchange=()=>{const f=file.files?.[0];info.textContent=f?f.name+' · '+(f.size/1048576).toFixed(1)+' MB':'فایل انتخاب نشده'};
 const toAudio=async f=>{
  if(!f)return undefined;
  if(f.size>2_000_000)throw Error('حجم نریشن برای ارسال مستقیم باید کمتر از ۲ مگابایت باشد. برای فایل‌های بزرگ باید آپلود جداگانه راه‌اندازی شود.');
  const ext=(f.name.split('.').pop()||'mp3').toLowerCase();if(!['mp3','wav','m4a','ogg','aac','webm'].includes(ext))throw Error('فرمت صوتی مجاز نیست.');
  const raw=await new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>resolve(rd.result);rd.onerror=()=>reject(Error('خواندن نریشن ناموفق بود'));rd.readAsDataURL(f)});
  return {extension:ext,base64:String(raw).split(',')[1]};
 };
 async function importResult(){
  if(!result)return status('هنوز خروجی Hermes آماده نیست.',true);
  if(typeof window.rfImportHermesProject!=='function')return status('صفحه تدوین بارگذاری نشده؛ Ctrl+F5 را بزن.',true);
  if(lastImported===active){status('این سفارش قبلاً به تایم‌لاین همین صفحه وارد شده است.');return}
  imp.disabled=true;status('در حال دریافت صحنه‌های واقعی و قرار دادن روی تایم‌لاین…');
  try{
   const count=await window.rfImportHermesProject(result);
   if(count){if(file.files?.[0]&&!result?.project?.voice_url&&typeof window.rf0912ImportNarration==='function')await window.rf0912ImportNarration(file.files[0]);lastImported=active;status('✓ '+count+' صحنه وارد تایم‌لاین شد. برای تغییر، کلیپ یا تیتر را انتخاب کن؛ خروجی فقط با دکمه Export ساخته می‌شود.');imp.textContent='✓ وارد تایم‌لاین شد';imp.disabled=true}
   else{status('افزودن لغو شد؛ پروژه قبلی حفظ شد.');imp.disabled=false}
  }catch(e){status('خطا در واردکردن خروجی: '+e.message,true);imp.disabled=false}
 }
 async function poll(){
  if(!active||busy)return;
  try{
   const r=await post({op:'status',id:active});
   if(r.status==='queued')return status('سفارش ثبت شد؛ در صف تدوین سیستم همکارت…');
   if(r.status==='running')return status('Hermes مشغول ساخت صحنه‌های تدوین است…');
   if(r.status==='failed'){stopPoll();btn.disabled=false;return status('تدوین ناموفق بود: '+(r.error||'گزارش را روی سیستم همکار بررسی کنید.'),true)}
   if(r.status==='ready'){
    stopPoll();result=r.result;btn.disabled=false;imp.disabled=false;
    const link=$('rfHermesPreviewLink');if(result?.final_mp4_url){link.href=result.final_mp4_url;link.hidden=false}
    status(result?.editable?'Hermes پروژه لایه‌باز تحویل داد؛ در حال واردکردن خودکار…':'Hermes فقط MP4 تحویل داده؛ این ویدیو به صورت یک کلیپ قابل برش وارد می‌شود.');
    await importResult();return
   }
  }catch(e){status('پیگیری موقتاً ناموفق است: '+e.message+'. دوباره تلاش کن.',true);previous.hidden=false}
 }
 btn.onclick=async()=>{
  const script=$('rfHermesScript').value.trim()||$('script')?.value?.trim()||'';
  if(script.length<3)return status('ابتدا متن یا دستور تدوین را وارد کن.',true);
  if(!access()){$('rfHermesAccessCode').closest('details').open=true;return status('کد دسترسی تدوین را از مدیر سایت وارد کن.',true)}
  if(busy)return;
  busy=true;btn.disabled=true;previous.hidden=true;
  try{
   const audio=await toAudio(file.files?.[0]);status('در حال ارسال سفارش به Hermes…');
   const r=await post({op:'submit',script,audio});
   if(!r.id)throw Error('سرور شماره سفارش برنگرداند.');
   sessionStorage.setItem('rfHermesAccess',access());active=r.id;result=null;lastImported='';
   sessionStorage.setItem('rfHermesActive',active);
   status('سفارش '+active+' ثبت شد؛ در صف اجرا…');
   stopPoll();poller=setInterval(poll,5000);await poll();previous.hidden=false;
  }catch(e){btn.disabled=false;status('ارسال ناموفق بود: '+e.message,true)}finally{busy=false}
 };
 imp.onclick=importResult;
 previous.onclick=poll;
 // Restore an interrupted browser tab without resubmitting editing work.
 const saved=sessionStorage.getItem('rfHermesActive');if(saved){active=saved;previous.hidden=false;status('یک سفارش قبلی پیدا شد. برای پیگیری کد دسترسی را وارد کن و «پیگیری سفارش قبلی» را بزن.');}
 checkHealth();
})();
