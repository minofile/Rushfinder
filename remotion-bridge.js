(()=>{'use strict';
const frame=document.getElementById('rfRemotionFrame');
const host=document.getElementById('rfPreviewFrame');
const toggle=document.getElementById('rfRemotionToggle');
if(!frame||!host||!toggle)return;
let pendingPlan=null,ready=false,active=false,fromRemotion=false;
const post=(type,plan)=>{try{frame.contentWindow?.postMessage({source:'rushfinder-host',type,plan},location.origin)}catch(_){}};
function show(on){
 active=!!on;host.classList.toggle('rf-remotion-active',active);
 toggle.classList.toggle('is-active',active);
 toggle.textContent=active?'بازگشت به پیش‌نمایش اصلی':'Remotion Studio';
 if(active){if(!ready)frame.contentWindow?.postMessage({source:'rushfinder-host',type:'request-ready'},location.origin);else if(pendingPlan)post('load-plan',pendingPlan);}
}
toggle.addEventListener('click',()=>show(!active));
frame.addEventListener('load',()=>{ready=false;post('request-ready');});
post('request-ready');
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.source!=='rushfinder-remotion')return;
 const {type,plan}=event.data;
 if(type==='ready'){
  ready=true;
  if(pendingPlan)post('load-plan',pendingPlan);
  else{
   const existing=window.rfGetRemotionTimelinePlan?.();
   if(existing?.scenes?.length)post('load-plan',existing);
  }
 }
 if(type==='plan-updated'&&plan){
  pendingPlan=plan;fromRemotion=true;
  const applied=window.rfApplyRemotionPlanEdits?.(plan);
  fromRemotion=false;
  if(applied)window.dispatchEvent(new CustomEvent('rfRemotionEdited',{detail:{plan}}));
 }
});
window.addEventListener('rfTimelineChanged',()=>{
 if(fromRemotion)return;
 const current=window.rfGetRemotionTimelinePlan?.();
 if(current?.scenes?.length){pendingPlan=current;if(ready)post('load-plan',pendingPlan);}
});
window.rfRemotionSendPlan=function(plan){
 if(!plan||!Array.isArray(plan.scenes))return false;
 pendingPlan=plan;
 show(true);
 if(ready)post('load-plan',pendingPlan);
 return true;
};
window.rfRemotionShow=show;
})();
