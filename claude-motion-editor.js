(()=>{'use strict';const $=id=>document.getElementById(id);let lastPlan=null;
const status=(s)=>{$('rfClaudeMotionStatus').textContent=s};
$('rfClaudeGenerate')?.addEventListener('click',async()=>{
 const script=$('script')?.value?.trim();if(!script){status('اول متن نریشن را در کادر متن وارد کن.');return;}
 const btn=$('rfClaudeGenerate');btn.disabled=true;$('rfClaudeSceneList').replaceChildren();status('Claude در حال تحلیل نریشن و طراحی صحنه‌هاست…');
 try{const r=await fetch('/api/chat?mode=claude-motion-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({script,duration:$('rfMotionDuration').value,style:$('rfMotionStyle').value})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw Error(d.error||'پاسخ معتبر از سرور دریافت نشد.');lastPlan=d.plan;
 const list=$('rfClaudeSceneList');d.plan.scenes.forEach((s,i)=>{const card=document.createElement('div');card.style.cssText='padding:8px;border:1px solid #2b4969;border-radius:8px;background:#0b1b2d';const h=document.createElement('b');h.textContent=(i+1)+'. '+s.title;const p=document.createElement('div');p.className='note';p.textContent=s.visual+' · '+s.duration+' ثانیه · '+s.motion;card.append(h,p);list.append(card)});
 status('سناریو آماده شد ('+d.plan.scenes.length+' صحنه، مدل '+d.model+'). برای چیدن روی تایم‌لاین دکمه زیر را بزن.');$('rfClaudeSavePlan').disabled=false;
 }catch(e){status('خطا: '+e.message)}finally{btn.disabled=false;}
});
$('rfClaudeSavePlan')?.addEventListener('click',async()=>{if(!lastPlan)return;const b=$('rfClaudeSavePlan');b.disabled=true;try{const ok=await window.rfCreateClaudeMotionProject(lastPlan);if(ok){status('صحنه‌ها روی تایم‌لاین قرار گرفتند. هر کارت تصویری و عنوان را جداگانه انتخاب و ویرایش کن؛ خروجی فقط با دکمه خروجی ساخته می‌شود.');document.querySelector('[data-tab="media"]')?.click();}}catch(e){status('خطا در ساخت تایم‌لاین: '+e.message)}finally{b.disabled=false;}});
})();