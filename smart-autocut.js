(()=>{'use strict';
// 0934 real AutoCut: Gemini planning -> YouTube/Aparat discovery -> frame
// verification -> local legal-media worker FFmpeg -> real editable timeline.
const $=id=>document.getElementById(id);
const worker='http://127.0.0.1:8767';
const button=$('rfAutoCutReal');if(!button)return;
const status=$('rfYTStatus');
function say(msg,bad=false){status.textContent=msg;status.style.color=bad?'#b6293c':'#276b74';}
const seconds=n=>Math.max(0,Number(n)||0);
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
async function json(url,opts={}){
 const r=await fetch(url,opts);
 let data;try{data=await r.json()}catch{throw Error('پاسخ غیر JSON از '+url)}
 if(!r.ok){const e=new Error(String(data.error||('HTTP '+r.status)));e.httpStatus=r.status;e.code=String(data.code||'');throw e;}
 return data;
}
const post=(url,data)=>json(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function split(text){
 let parts=String(text).trim().replace(/\r/g,'').split(/(?<=[.!؟؛])\s+|\n+/).map(x=>x.trim()).filter(Boolean);
 if(!parts.length)return [];
 while(parts.length>8){let k=0,best=Infinity;for(let i=0;i<parts.length-1;i++){let score=(parts[i]+' '+parts[i+1]).length;if(score<best){best=score;k=i}}parts.splice(k,2,parts[k]+' '+parts[k+1])}
 return parts;
}
function timings(parts,duration){const weights=parts.map(t=>Math.max(5,t.split(/\s+/).length));const sum=weights.reduce((a,b)=>a+b,0);
 let at=0;return weights.map((w,i)=>{const d=i===weights.length-1?Math.max(.6,duration-at):duration*w/sum;const b={start:at,duration:d};at+=d;return b})}
async function audioLength(file){
 if(!file)return 0;return new Promise(resolve=>{
  const a=new Audio(),url=URL.createObjectURL(file);
  const timer=setTimeout(()=>done(0),9000);let settled=false;
  function done(n){if(settled)return;settled=true;clearTimeout(timer);URL.revokeObjectURL(url);resolve(Number.isFinite(n)?n:0)}
  a.onloadedmetadata=()=>done(a.duration);a.onerror=()=>done(0);a.src=url;
 });
}
async function transcribe(file){
 if(file.size>2700000){
  say('در حال بخش‌بندی نریشن بلند با FFmpeg…');
  const r=await fetch(worker+'/audio-chunks',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'بخش‌بندی نریشن ممکن نشد');
  const texts=[];
  for(let i=0;i<(data.chunks||[]).length;i++){
   say('Gemini در حال گوش‌دادن به بخش صوتی '+(i+1)+'/'+data.chunks.length+'…');
   const p=data.chunks[i];const j=await post('/api/youtube-music?mode=smartedit-transcribe',{
    mimeType:p.mimeType,audioBase64:p.data});
   if(j.transcript)texts.push(j.transcript);
  }
  if(!texts.length)throw Error('Gemini نتوانست نریشن را پیاده‌سازی کند');
  return texts.join(' ');
 }
 const b64=await new Promise((resolve,reject)=>{
  const rd=new FileReader();rd.onload=()=>resolve(String(rd.result).split(',')[1]);rd.onerror=reject;rd.readAsDataURL(file)
 });
 const mime=({'audio/x-m4a':'audio/mp4','audio/x-wav':'audio/wav','audio/mp3':'audio/mpeg'}[file.type]||file.type||'audio/mpeg');
 return (await post('/api/youtube-music?mode=smartedit-transcribe',{mimeType:mime,audioBase64:b64})).transcript;
}
const ytLookups=new Map();
async function lookupYoutube(q){const k=q.trim().toLowerCase();if(!ytLookups.has(k))ytLookups.set(k,json('/api/youtube-music?mode=smartedit&q='+encodeURIComponent(q)).then(x=>x.items||[]).catch(e=>{ytLookups.delete(k);throw e}));return ytLookups.get(k)}
const apLookups=new Map();
async function lookupAparat(q){const k=q.trim().toLowerCase();if(!apLookups.has(k))apLookups.set(k,json('/api/youtube-music?mode=smartedit-aparat&q='+encodeURIComponent(q)).then(x=>x.items||[]).catch(e=>{apLookups.delete(k);throw e}));return apLookups.get(k)}
// The public YouTube URL input can fail even when Gemini text generation works.
// In that case, inspect actual FFmpeg-extracted frames of an accessible, authorized
// source video. Never convert a metadata match into an unverified cut.
async function inspectYT(v,segment,index,beat){
 let direct=null,verified=false;
 try{
  const j=await post('/api/youtube-music?mode=smartedit-vision',{
   videoId:v.id,videoDuration:v.durationSeconds||0,
   segments:[{index,text:segment,seconds:Math.min(60,beat.duration)}]
  });
  if(j.method==='gemini_video_frames'){
   verified=true;
   const m=(j.matches||[]).find(x=>x.index===index&&x.confidence>=.65);
   if(m){
    const dur=Math.min(beat.duration,Number(m.end)-Number(m.start));
    if(dur>=.5)return {start:beat.start,duration:dur,sourceStart:Number(m.start),provider:'youtube',videoId:v.id,sentence:segment,confidence:m.confidence,visualEvidence:m.visualEvidence};
   }
  }
 }catch(e){direct=e}
 // Wrong credentials, quota, and unavailable models cannot be fixed by
 // downloading frames, because the same server key/model is used for them.
 const message=String(direct?.message||direct||'');
 if(direct&&(direct.httpStatus===429||/GEMINI_(AUTH|QUOTA|MODEL)|کلید API|سهمیه|مجوز.*مدل/i.test(message)))throw direct;
 // A video URL might not be accepted by Gemini, or Gemini might miss a
 // short relevant shot. Check source frames instead; never invent a cut.
 say(verified?'لینک یوتیوب صحنه مرتبطی نشان نداد؛ بررسی فریم‌های واقعی…':'تحلیل لینک یوتیوب ناموفق بود؛ بررسی فریم‌های واقعی…');
 try{return await inspectFrames(v,segment,beat,'youtube')}
 catch(ferr){throw Error((direct?'لینک: '+message.slice(0,150)+' | ':'')+'فریم‌ها: '+String(ferr?.message||ferr).slice(0,170))}
}
async function inspectFrames(v,segment,beat,provider){
 const j=await post(worker+'/frames',{provider,videoId:v.id,rightsConfirmed:true});
 const analyzed=await post('/api/youtube-music?mode=smartedit-frames',{
  frames:j.frames,text:segment,seconds:beat.duration
 });
 if(analyzed.method!=='gemini_aparat_frames'||!analyzed.matches?.length)return null;
 let m=analyzed.matches[0];
 // A second pass samples a smaller window around the observed region.
 try{
  const r=await post(worker+'/frames',{provider,videoId:v.id,rightsConfirmed:true,
   around:(Number(m.start)+Number(m.end))/2,window:24});
  const refined=await post('/api/youtube-music?mode=smartedit-frames',{frames:r.frames,text:segment,seconds:beat.duration});
  if(refined.matches?.length)m=refined.matches[0];
 }catch(_e){} // Retain only the previously verified coarse result.
 const dur=Math.min(beat.duration,seconds(m.end)-seconds(m.start));
 return dur>=.5?{start:beat.start,duration:dur,sourceStart:seconds(m.start),provider,videoId:v.id,sentence:segment,confidence:m.confidence,visualEvidence:m.visualEvidence}:null;
}
async function inspectAparat(v,segment,beat){return inspectFrames(v,segment,beat,'aparat')}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function render(cuts){
 const started=await post(worker+'/jobs',{clips:cuts,rightsConfirmed:true});
 if(!/^[0-9a-f]{32}$/.test(started.jobId||''))throw Error('شناسه پروژه نامعتبر است');
 const until=Date.now()+15*60*1000;
 while(Date.now()<until){
  await wait(1800);
  const job=await json(worker+'/jobs/'+started.jobId);
  say('کات واقعی با FFmpeg: '+(job.stage||'در حال پردازش')+' · '+(job.percent||0)+'٪');
  if(job.status==='done')return job.clips;
  if(job.status==='error')throw Error(job.error||'برش واقعی انجام نشد');
 }
 throw Error('زمان دریافت ویدیوها تمام شد؛ وضعیت پنجره Media Worker را بررسی کن.');
}
function terms(text){return String(text).replace(/[،؛:«»؟.!\n]/g,' ').split(/\s+/).filter(x=>x.length>2).slice(0,7).join(' ').slice(0,75)}
// A failed AI query planner must not stop the whole editing session.
// These are search words only, never evidence for selecting a video scene.
function fallbackSearchQuery(text){
 const common=new Set(['برای','است','بود','شد','شده','های','این','آن','ویدیو','فیلم','تصاویر','خبر','تازه','گفت','کرد','کرده','مورد','بیشتر','درحال','درباره','روی','از','که','به','در','با','را','تا','و','یا']);
 return String(text||'').replace(/[،؛:«»؟.!\n\r]/g,' ').split(/\s+/).map(x=>x.trim()).filter(x=>x.length>=3&&!common.has(x)).slice(0,8).join(' ').slice(0,90);
}
function youtubeOptions(videos,anchors){
 const toks=(anchors||[]).map(x=>String(x).toLowerCase()).filter(x=>x.length>3);
 return videos.filter(v=>/^[A-Za-z0-9_-]{11}$/.test(v.id||''))
  .filter(v=>!/(cartoon|gameplay|parody|satire|music video|animation)/i.test(v.title||''))
  .map(v=>({...v,score:toks.reduce((n,x)=>n+(String(v.title+' '+v.description).toLowerCase().includes(x)?1:0),0)}))
  .sort((a,b)=>b.score-a.score).slice(0,4);
}
async function run(){
 button.disabled=true;
 const mode=$('rfAutoCutSource').value;
 try{
  if(!$('rfAutoCutRights').checked)throw Error('ابتدا تأیید کن اجازه دریافت و استفاده از ویدیوها را داری.');
  say('در حال بررسی مدل Gemini و اتصال سرویس‌ها…');
  const config=await json('/api/youtube-music?mode=smartedit-config');
  say('مدل فعال Gemini: '+config.geminiModel+(config.geminiWarning?' · '+config.geminiWarning:''));
  if(mode==='youtube'&&!config.youtubeConfigured)throw Error('کلید جست‌وجوی YouTube روی سرور تعریف نشده است.');
  say('در حال بررسی سرویس برش واقعی…');
  let health;
  try{health=await json(worker+'/health')}catch(e){
   throw Error('Media Worker پاسخ نداد؛ CMD را باز نگه دار و دسترسی مرورگر به 127.0.0.1:8767 را بررسی کن. '+e.message)
  }
  if(!health.ok)throw Error(String(health.error||'سرویس برش آماده نیست'));
  const voice=window.rfNarrationFile||null;
  let text=($('script').value||'').trim();
  if(!text&&voice){say('Gemini در حال گوش‌دادن به نریشن…');text=await transcribe(voice);$('script').value=text;}
  if(!text)throw Error('متن یا نریشن را ابتدا وارد کن.');
  const parts=split(text);if(!parts.length)throw Error('نریشن بخش‌بندی نشد.');
  const d=await audioLength(voice)||parts.reduce((n,p)=>n+p.split(/\s+/).length,0)/2.3;
  const dur=clamp(d,3,1200),beats=timings(parts,dur);
  let plan={segments:[]},planWarning='';
  if(mode!=='aparat'){
   say('Gemini در حال تحلیل '+parts.length+' بخش نریشن…');
   try{
    plan=await post('/api/youtube-music?mode=smartedit-analyze',{
     task:'plan',segments:parts.map((t,index)=>({index,text:t}))
    });
   }catch(e){
    planWarning=String(e.message||e);
    say('تحلیل اولیه پاسخ نداد؛ جست‌وجو با کلمات متن ادامه پیدا می‌کند. صحنه‌ها همچنان باید با Gemini تأیید شوند.');
   }
  }
  const plans=new Map((plan.segments||[]).map(x=>[x.index,x]));
  const candidates=[];
  for(let i=0;i<parts.length;i++){
   const ai=plans.get(i),q=String(ai?.query||fallbackSearchQuery(parts[i])).trim(),apaQ=terms(parts[i]);
   if(!q&&mode==='youtube'){
    candidates.push({youtube:[],aparat:[],query:'',anchors:[]});continue;
   }
   say('جست‌وجوی ویدیو '+(i+1)+' از '+parts.length+' در یوتیوب/آپارات…');
   const [yt,ap]=await Promise.allSettled([
    mode!=='aparat'&&q?lookupYoutube(q):Promise.resolve([]),
    mode!=='youtube'?lookupAparat(apaQ):Promise.resolve([])
   ]);
   const y=yt.status==='fulfilled'?yt.value:[];
   const a=ap.status==='fulfilled'?ap.value:[];
   if(yt.status==='rejected'&&mode==='youtube')throw yt.reason;
   if(ap.status==='rejected'&&mode==='aparat')throw ap.reason;
   if(yt.status==='rejected'&&mode==='both')say('جست‌وجوی یوتیوب برای بخش '+(i+1)+' ناموفق بود؛ آپارات بررسی می‌شود.');
   candidates.push({youtube:youtubeOptions(y,ai?.anchors),aparat:a.filter(v=>/^[A-Za-z0-9_-]{4,25}$/.test(v.id||'')).slice(0,2),query:q,anchors:ai?.anchors||[]});
  }
  // Gemini judges metadata conservatively BEFORE requesting visual timestamp checks.
  const judgements=mode==='aparat'?null:await post('/api/youtube-music?mode=smartedit-analyze',{
   task:'judge',segments:parts.map((text,index)=>({index,text})),
   candidates:candidates.map((g,index)=>({index,options:g.youtube}))
  }).catch(()=>null);
  const judged=new Map((judgements?.matches||[]).map(x=>[x.index,new Set(x.ids||[])]));
  const cuts=[],missing=[],inspectionErrors=[];
  for(let i=0;i<parts.length;i++){
   const g=candidates[i],beat=beats[i];say('Gemini در حال دیدن محتوای تصویری بخش '+(i+1)+'/'+parts.length+'…');
   let hit=null;
   const youtubeChoices=judgements?g.youtube.filter(v=>judged.get(i)?.has(v.id)):g.youtube.slice(0,1);
   for(const v of youtubeChoices.slice(0,2)){
    try{hit=await inspectYT(v,parts[i],i,beat);if(hit)break}catch(e){inspectionErrors.push('YouTube: '+String(e.message||e));console.warn('YouTube vision',e.message)}
   }
   if(!hit){for(const v of g.aparat.slice(0,2)){
    try{hit=await inspectAparat(v,parts[i],beat);if(hit)break}catch(e){inspectionErrors.push('Aparat: '+String(e.message||e));console.warn('Aparat vision',e.message)}
   }}
   if(hit)cuts.push(hit);else missing.push(i+1);
  }
  if(!cuts.length){
   const found=candidates.some(g=>g.youtube.length||g.aparat.length);
   if(inspectionErrors.length)throw Error('هیچ کات واقعی تأیید نشد. خطای بررسی تصویر: '+inspectionErrors[0].slice(0,220));
   if(!found)throw Error('هیچ ویدیوی مناسبی در منابع انتخاب‌شده پیدا نشد؛ کات ساختگی ایجاد نمی‌کنیم. '+(planWarning?'تحلیل اولیه: '+planWarning.slice(0,110):''));
   throw Error('Gemini هیچ صحنه مرتبطی را در تصویر ویدیوهای پیدا‌شده تأیید نکرد؛ کات ساختگی ایجاد نمی‌کنیم.');
  }
  say('Gemini '+cuts.length+' صحنه تأیید کرد؛ در حال دریافت فایل‌های مجاز و برش واقعی…');
  const real=await render(cuts);
  say('در حال انتقال کلیپ‌های واقعی به تایم‌لاین RushFinder…');
  const n=await window.rfApplyRealAutoCutClips(real,dur);
  window.rfYTReset?.();
  say('✓ '+n+' کلیپ واقعی در نوار ویدیو قرار گرفت. '+(missing.length?'بخش‌های '+missing.join('، ')+' تصویر تأییدشده ندارند و خالی ماندند.':'همه بخش‌ها بررسی شدند.')+(planWarning?' (جست‌وجوی اولیه بدون برنامه‌ریز Gemini انجام شد.)':'')+' خروجی را از دکمه «خروجی ویدیو» بگیر.');
 }catch(e){say('تدوین خودکار متوقف شد: '+String(e.message||e),true)}
 finally{button.disabled=false}
}
button.addEventListener('click',run);
})();
