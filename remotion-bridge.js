(()=>{'use strict';
const frame=document.getElementById('rfRemotionFrame');
const toggle=document.getElementById('rfRemotionToggle');
if(!frame||!toggle)return;
let pendingPlan=null,ready=false,active=false,fromRemotion=false,loadTimeout=null;
const overlay=document.createElement('div');
overlay.id='rfRemotionOverlay';
overlay.setAttribute('role','dialog');
overlay.setAttribute('aria-modal','true');
overlay.setAttribute('aria-label','استودیوی موشن Remotion');
overlay.innerHTML=`<div id="rfRemotionPanel">
 <div id="rfRemotionBar"><strong>استودیوی موشن‌گرافیک · Remotion Player</strong>
 <div class="rf-remotion-buttons"><button type="button" id="rfRemotionReload">بارگذاری مجدد</button><button type="button" id="rfRemotionClose">بستن ×</button></div></div>
 <div id="rfRemotionInfo" role="status" aria-live="polite">در حال بررسی نسخه ساخته‌شده Remotion…</div>
 <div id="rfRemotionMount" style="flex:1;display:flex;min-height:0;overflow:hidden"></div>
</div>`;
document.body.appendChild(overlay);
const info=overlay.querySelector('#rfRemotionInfo');
const mount=overlay.querySelector('#rfRemotionMount');
mount.appendChild(frame);
frame.removeAttribute('hidden');
const defaultFrameSrc='/motion-studio-web/index.html?embed=1&v=0951';
const post=(type,plan)=>{try{frame.contentWindow?.postMessage({source:'rushfinder-host',type,plan},location.origin)}catch(error){console.warn('Remotion bridge:',error)}};
function status(message,error=false){info.textContent=message;info.classList.toggle('rf-error',!!error);info.hidden=false}
function requestReady(){post('request-ready')}
function startReadyTimeout(){
 clearTimeout(loadTimeout);
 loadTimeout=setTimeout(()=>{
  if(ready)return;
  status('موتور Remotion هنوز Build و منتشر نشده است. در GitHub پروژه وارد Actions ← Build Remotion Studio شو. بعد از سبز شدن Build و Ready شدن Vercel، «بارگذاری مجدد» را بزن.',true);
 },9000);
}
function show(on){
 active=!!on;
 overlay.classList.toggle('is-open',active);
 toggle.classList.toggle('is-active',active);
 toggle.textContent=active?'بستن استودیوی Remotion':'استودیوی Remotion';
 document.body.style.overflow=active?'hidden':'';
 if(active){
   if(ready){info.hidden=true;if(pendingPlan)post('load-plan',pendingPlan)}
   else {status('در حال بارگذاری Remotion Player…');requestReady();startReadyTimeout()}
 }
}
toggle.addEventListener('click',()=>show(!active));
overlay.querySelector('#rfRemotionClose').addEventListener('click',()=>show(false));
overlay.querySelector('#rfRemotionReload').addEventListener('click',()=>{
 ready=false;
 status('در حال دریافت آخرین نسخه Remotion…');
 frame.src=defaultFrameSrc+'&cache='+Date.now();
 startReadyTimeout();
});
overlay.addEventListener('click',e=>{if(e.target===overlay)show(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)show(false)});
frame.addEventListener('load',()=>{ready=false;requestReady();if(active)startReadyTimeout()});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.source!=='rushfinder-remotion')return;
 const {type,plan}=event.data;
 if(type==='ready'){
  ready=true;clearTimeout(loadTimeout);info.hidden=true;
  if(pendingPlan)post('load-plan',pendingPlan);
  else{
   const existing=window.rfGetRemotionTimelinePlan?.();
   if(existing?.scenes?.length)post('load-plan',existing);
  }
 }
 if(type==='plan-updated'&&plan){
  pendingPlan=plan;fromRemotion=true;
  try{
   const applied=window.rfApplyRemotionPlanEdits?.(plan);
   if(applied)window.dispatchEvent(new CustomEvent('rfRemotionEdited',{detail:{plan}}));
  }finally{fromRemotion=false}
 }
});
window.addEventListener('rfTimelineChanged',()=>{
 if(fromRemotion)return;
 const current=window.rfGetRemotionTimelinePlan?.();
 if(current?.scenes?.length){pendingPlan=current;if(ready)post('load-plan',pendingPlan)}
});
window.rfRemotionSendPlan=function(plan){
 if(!plan||!Array.isArray(plan.scenes))return false;
 pendingPlan=plan;show(true);if(ready)post('load-plan',pendingPlan);
 return true;
};
window.rfRemotionShow=show;
})();
