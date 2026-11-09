(()=>{'use strict';const $=id=>document.getElementById(id);let lastPlan=null;
const status=(s)=>{const el=$('rfClaudeMotionStatus');if(el)el.textContent=s};
(async()=>{try{
 const response=await fetch('/api/chat?mode=motion-provider-status',{cache:'no-store'});
 if(!response.ok)return;
 const info=await response.json();
 const label=document.querySelector('#rfClaudeProvider .rf-ai-name');
 const state=document.querySelector('#rfClaudeProvider .rf-ai-state');
 if(info.activeProvider==='groq'){
  if(label)label.textContent='Groq';if(state)state.textContent='فعال';
  status('Groq آماده است؛ با یک کلیک صحنه‌ها ساخته و روی نوار قرار می‌گیرند.');
 }else if(info.activeProvider==='claude'){
  if(label)label.textContent='Claude';if(state)state.textContent='فعال';
  status('Claude آماده است؛ با یک کلیک صحنه‌ها ساخته و روی نوار قرار می‌گیرند.');
 }else{
  if(label)label.textContent='Groq / Claude';if(state)state.textContent='نیازمند API';
  status('کلید GROQ_API_KEY یا ANTHROPIC_API_KEY را در Vercel تنظیم کن.');
 }
}catch(_){status('برای ساخت موشن، اتصال Groq یا Claude به سرور بررسی شود.');}})();
$('rfClaudeGenerate')?.addEventListener('click',async()=>{
 const script=$('script')?.value?.trim();if(!script){status('اول متن نریشن را وارد کن.');return;}
 const btn=$('rfClaudeGenerate');btn.disabled=true;const list=$('rfClaudeSceneList');list?.replaceChildren();
 status('در حال تحلیل نریشن و ساخت مستقیم موشن روی تایم‌لاین…');
 try{
  const r=await fetch('/api/chat?mode=claude-motion-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({script,duration:$('rfMotionDuration').value,style:$('rfMotionStyle').value})});
  const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'پاسخ معتبر از سرور دریافت نشد.');
  if(!Array.isArray(d.plan?.scenes)||!d.plan.scenes.length)throw Error('هیچ صحنه‌ای در پاسخ هوش مصنوعی نبود.');
  if(typeof window.rfCreateClaudeMotionProject!=='function')throw Error('موتور تایم‌لاین بارگذاری نشده؛ سایت را با Ctrl+F5 باز کن.');
  status('سناریو آماده شد. در حال ساخت تصاویر گرافیکی و افزودن خودکار به تایم‌لاین…');
  const count=await window.rfCreateClaudeMotionProject(d.plan);
  if(!count){status('افزودن صحنه‌ها لغو شد؛ تایم‌لاین قبلی حفظ شد.');return;}
  lastPlan=d.plan;
  window.rfRemotionSendPlan?.(d.plan);
  d.plan.scenes.forEach((s,i)=>{const card=document.createElement('div');card.style.cssText='padding:8px;border:1px solid #b8d4f3;border-radius:8px;background:#f6faff;color:#214a74';const h=document.createElement('b');h.textContent=(i+1)+'. '+s.title;const p=document.createElement('div');p.className='note';p.style.color='#476584';p.textContent=(s.visual||'')+' · '+s.duration+' ثانیه';card.append(h,p);list?.append(card)});
  status('✓ '+count+' صحنه موشن ساخته و خودکار روی تایم‌لاین قرار گرفتند. پخش و ویرایش کن؛ خروجی فقط با دکمه «خروجی ویدئو» شروع می‌شود.');
  $('rfClaudeSavePlan').disabled=false;
 }catch(e){status('خطا در ساخت خودکار: '+e.message)}finally{btn.disabled=false;}
});
$('rfClaudeSavePlan')?.addEventListener('click',()=>{
 if(!lastPlan)return;
 const blob=new Blob([JSON.stringify(lastPlan,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='RushFinder-Motion-Storyboard.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 status('سناریوی JSON ذخیره شد. تایم‌لاین از قبل ساخته شده و آماده ویرایش است.');
});
})();
