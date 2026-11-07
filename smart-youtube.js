(()=>{'use strict';
// SmartEdit 0925 YouTube cut-preview storyboard: official YouTube IFrame, NO content download or MP4 capture.
const $=id=>document.getElementById(id), out=(el,s)=>{if(el)el.textContent=s};
const btn=$('rfYTSearch'), status=$('rfYTStatus'), results=$('rfYTResults'), track=$('rfYTTrack');
const overlay=$('rfYTOverlay'), host=$('rfYTPlayerHost'), inspector=$('rfYTCutInspector');
const S={items:[],selected:-1,player:null,apiReady:false,videoId:'',loadedClip:-1,voiceFile:null,voiceURL:null,voice:null,duration:0,active:false,timer:null,playToken:0,clipId:1,startPerf:0,lastTime:0};
const fmt=n=>{n=Math.max(0,Number(n)||0);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`};
const safe=s=>String(s||'').slice(0,180), clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
function message(s,err=false){out(status,s);status.style.color=err?'#a53a44':'#426580'}
function durationTotal(){return S.items.length?Math.max(...S.items.map(x=>x.start+x.duration)):0}
function updateClock(t){
 S.lastTime=Math.max(0,t);
 const total=Math.max(S.duration||0,durationTotal());
 if(!window.rfSmartEditHasClips?.()){
  out($('time'),fmt(t)+' / '+fmt(total));
  $('playhead').style.left=(36+t*Number($('zoom')?.value||44))+'px';
  $('scrubFill').style.width=(total?clamp(t/total*100,0,100):0)+'%';
 }
} 
const topics=[[/غزه|غزّه/i,'Gaza'],[/لبنان|حزب الله/i,'Lebanon'],[/ایران|تهران/i,'Iran'],[/اسرائیل|صهیونیست/i,'Israel'],[/کنست|پارلمان/i,'Knesset'],[/انتخابات|رای گیری/i,'election'],[/جنگ|حمله|درگیری/i,'conflict'],[/نتانیاهو/i,'Netanyahu'],[/زلزله/i,'earthquake'],[/باران|سیل/i,'flood'],[/فوتبال/i,'football'],[/مدرسه|آموزش/i,'education'],[/اقتصاد|تورم/i,'economy'],[/بیمارستان|درمان/i,'hospital'],[/هواپیما/i,'aircraft'],[/مذاکرات/i,'talks'],[/آمریکا|ایالات متحده/i,'United States'],[/ترامپ/i,'Trump']];
function searchQuery(s){let found=topics.filter(([re])=>re.test(s)).map(([,v])=>v);return found.length?[...new Set(found)].slice(0,5).join(' ')+' news footage':s.replace(/[،؛:«»؟.!\n]/g,' ').split(/\s+/).filter(x=>x.length>=3).slice(0,7).join(' ').slice(0,90)}
function sentences(raw){
 const rawParts=raw.replace(/\r/g,'').split(/(?<=[.!؟؛])\s+|\n+/).map(v=>v.trim()).filter(Boolean),a=[];
 for(const part of rawParts){const words=part.split(/\s+/).filter(Boolean);while(words.length)a.push(words.splice(0,Math.min(42,Math.max(22,Math.ceil(words.length/Math.max(1,Math.ceil(words.length/34)))))).join(' '))}
 return a.slice(0,20);
}
function beats(lines,seconds){const ws=lines.map(s=>Math.max(8,s.split(/\s+/).length*6));let sum=ws.reduce((a,b)=>a+b,0),st=0;return ws.map((w,i)=>{let duration=i===lines.length-1?seconds-st:seconds*w/sum;const r={start:st,duration};st+=duration;return r})}
function relevance(v,q){const terms=q.toLowerCase().replace(/news|footage|video|the|in|of/g,'').split(/\s+/).filter(t=>t.length>2);let str=(v.title+' '+v.channel).toLowerCase();let n=terms.reduce((s,t)=>s+(str.includes(t)?3:0),0);if(/mocking|parody|satire|ai video|reaction|gameplay|music video|comedy/i.test(str))n-=14;return n}
function sortedOptions(items,q){return items.filter(x=>/^[\w-]{11}$/.test(x.id||'')).map(v=>({...v,rank:relevance(v,q)})).sort((a,b)=>b.rank-a.rank).slice(0,14)}
async function probeVoice(file){if(!file)return 0;return new Promise(resolve=>{const au=document.createElement('audio'),url=URL.createObjectURL(file);let done=false;const finish=n=>{if(done)return;done=true;clearTimeout(timer);URL.revokeObjectURL(url);resolve(Number.isFinite(n)?n:0)};const timer=setTimeout(()=>finish(0),7000);au.onloadedmetadata=()=>finish(au.duration);au.onerror=()=>finish(0);au.src=url;au.load()})}
function attachVoice(file){if(!file)return;S.voiceFile=file;if(S.voiceURL)URL.revokeObjectURL(S.voiceURL);S.voiceURL=URL.createObjectURL(file);if(!S.voice){S.voice=new Audio();S.voice.preload='auto';S.voice.addEventListener('ended',stop)}S.voice.src=S.voiceURL;S.voice.volume=1}
$('autoVoiceInput')?.addEventListener('change',e=>attachVoice(e.target.files?.[0]),true);
$('guideVoice')?.addEventListener('change',e=>attachVoice(e.target.files?.[0]),true);
function selectedItem(){return S.items[S.selected]}
function setSelection(i,activate=true){if(i<0||!S.items[i])return;S.selected=i;renderTrack();renderInspector();updateClock(S.items[i].start);if(activate){stop();showClip(i,false,0)}}
function renderTrack(){
 track.replaceChildren();const px=Number($('zoom')?.value||44),realClips=!!window.rfSmartEditHasClips?.();
 const videoTrack=$('videoTrack');videoTrack?.querySelectorAll('.rf-yt-shadow').forEach(el=>el.remove());
 $('timeline').style.minWidth=Math.max(880,Math.ceil(36+durationTotal()*px+90))+'px';
 if(!S.items.length){track.innerHTML='<div class="drop-hint">برش‌های پیشنهادی YouTube اینجا نمایش داده می‌شوند</div>';return}
 S.items.forEach((item,i)=>{
  const v=item.options[item.optionIndex||0];const label=(item.unverified?'⚠ ':'✂ ')+safe(v?.title||'نامشخص').slice(0,48);
  function makeButton(shadow){const b=document.createElement('button');b.type='button';b.className='rf-yt-clip'+(i===S.selected?' active':'')+(shadow?' rf-yt-shadow':'');b.style.left=(36+item.start*px)+'px';b.style.width=Math.max(35,item.duration*px-2)+'px';b.textContent=(shadow?'▶ پیش‌نمایش · ':'')+label;
   b.title='برش مجازی '+(i+1)+' · '+fmt(item.start)+'–'+fmt(item.start+item.duration)+' | ویدئوی یوتیوب: '+fmt(item.sourceStart)+'–'+fmt(item.sourceStart+item.duration)+' | غیرقابل خروجی MP4';
   b.addEventListener('click',()=>setSelection(i));return b}
  track.appendChild(makeButton(false));if(!realClips&&videoTrack)videoTrack.appendChild(makeButton(true));
 });
} 
function updateInspector(){return renderInspector()}
function renderInspector(){if(!inspector)return;inspector.replaceChildren();const it=selectedItem();if(!it){inspector.textContent='یک برش را از تایم‌لاین انتخاب کن تا نقطه شروع، مدت و منبع را عوض کنی.';return;}
 const title=document.createElement('strong');title.textContent='✂ تنظیم برش '+(S.selected+1)+' · '+fmt(it.start)+' تا '+fmt(it.start+it.duration);inspector.appendChild(title);
 const hint=document.createElement('p');hint.className='rf-yt-hint';hint.textContent='زمان شروع از داخل ویدئوی اصلی (نه زمان نریشن). صحنه پیشنهادی با تحلیل تصویر تأیید نشده است.';inspector.appendChild(hint);
 const grid=document.createElement('div');grid.className='rf-cut-grid';
 const makeInput=(label,value,min,step)=>{const w=document.createElement('label');w.textContent=label;const inp=document.createElement('input');inp.type='number';inp.min=String(min);inp.step=String(step);inp.value=String(value);w.appendChild(inp);grid.appendChild(w);return inp};
 const source=makeInput('شروع از ویدئوی یوتیوب (ثانیه)',it.sourceStart,0,0.5);
 const length=makeInput('مدت برش (ثانیه)',it.duration,0.5,0.5);
 inspector.appendChild(grid);
 const line=document.createElement('div');line.className='rf-yt-actions';
 const add=(label,fn)=>{const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=label;b.onclick=fn;line.appendChild(b);return b};
 add('✓ اعمال برش',()=>{stop(false);const old=it.duration;it.sourceStart=clamp(Number(source.value),0,21600);it.duration=clamp(Number(length.value),0.5,60);it.sourceEnd=it.sourceStart+it.duration;shiftFollowing(it, it.duration-old);renderReferences();setSelection(Math.max(0,S.items.indexOf(it)));message('بازه شروع و پایان این برش تغییر کرد. پخش‌کننده فقط این قسمت را پیش‌نمایش می‌دهد.')});
 add('✂ تقسیم وسط برش',()=>splitAt(it.start+it.duration/2));
 add('🗑 حذف برش',()=>{stop(false);const j=S.items.indexOf(it);S.items.splice(j,1);shiftAll();S.selected=Math.min(j,S.items.length-1);renderReferences();if(S.selected>=0)showClip(S.selected,false,0);else{overlay.hidden=true;message('برش حذف شد.')}});
 inspector.appendChild(line);
}
function shiftFollowing(it,delta){const pos=S.items.indexOf(it);for(let i=pos+1;i<S.items.length;i++)S.items[i].start+=delta;S.duration=Math.max(0,durationTotal());updateClock(0)}
function shiftAll(){let at=0;for(const it of S.items){it.start=at;at+=it.duration}S.duration=at;updateClock(0)}
function renderReferences(){results.replaceChildren();S.items.forEach((item,i)=>{const row=document.createElement('div');row.className='rf-yt-result'+(item.unverified?' rf-yt-unverified':'');const v=item.options[item.optionIndex||0];const thumb=document.createElement('img');thumb.alt='تصویر بندانگشتی منبع';if(/^https:\/\//.test(v?.thumbnail||''))thumb.src=v.thumbnail;row.appendChild(thumb);
 const side=document.createElement('div');const head=document.createElement('b');head.textContent='برش '+(i+1)+' · '+fmt(item.start)+'–'+fmt(item.start+item.duration);side.appendChild(head);
 const selector=document.createElement('select');selector.setAttribute('aria-label','انتخاب منبع برش '+(i+1));for(const [j,opt] of item.options.entries()){const o=document.createElement('option');o.value=j;o.textContent=safe(opt.title);selector.appendChild(o)}selector.value=item.optionIndex||0;selector.onchange=()=>{stop(false);item.optionIndex=+selector.value;renderReferences();setSelection(i)};side.appendChild(selector);
 const warn=document.createElement('small');warn.textContent=item.unverified?'⚠ ارتباط این نتیجه با موضوع تأیید نشده؛ پیش از انتشار بررسی کن.':'انتخاب براساس عنوان و متادیتا؛ صحنه باید بازبینی شود.';side.appendChild(warn);
 const link=document.createElement('a');link.href='https://www.youtube.com/watch?v='+v.id+'&t='+Math.floor(item.sourceStart)+'s';link.target='_blank';link.rel='noopener noreferrer';link.textContent='منبع در YouTube';side.appendChild(link);row.appendChild(side);row.onclick=e=>{if(e.target===selector||e.target===link)return;setSelection(i)};results.appendChild(row)});renderTrack();renderInspector()}
$('zoom')?.addEventListener('input',renderTrack);window.addEventListener('rfTimelineChanged',renderTrack);
function ensurePlayer(){if(window.YT?.Player)return Promise.resolve();if(!document.querySelector('script[data-rfyt]')){const el=document.createElement('script');el.async=true;el.dataset.rfyt='1';el.src='https://www.youtube.com/iframe_api';document.head.appendChild(el)}return new Promise((resolve,reject)=>{const expire=Date.now()+13000;const timer=setInterval(()=>{if(window.YT?.Player){clearInterval(timer);resolve()}else if(Date.now()>expire){clearInterval(timer);reject(new Error('پخش‌کننده یوتیوب بارگذاری نشد؛ اینترنت یا محدودیت نمایش ویدئو را بررسی کن.'))}},160)})}
// IFrame events, not direct media decoding; no extraction or re-encoding of YouTube frames.
async function showClip(index,playing=false,elapsed=0){const it=S.items[index];if(!it)return;S.selected=index;renderTrack();renderInspector();overlay.hidden=false;const token=++S.playToken;
 try{await ensurePlayer();if(token!==S.playToken)return;const opt=it.options[it.optionIndex||0];const sec=clamp(it.sourceStart+elapsed,0,86400),end=it.sourceStart+it.duration;
  const args={videoId:opt.id,startSeconds:sec,endSeconds:end};
  if(!S.player){host.replaceChildren();const el=document.createElement('div');el.id='rfYTPlayerSlot';host.appendChild(el);S.player=new YT.Player(el.id,{width:'640',height:'360',videoId:opt.id,playerVars:{playsinline:1,controls:1,rel:0,origin:location.origin},events:{onReady:e=>{e.target.mute();if(playing)e.target.loadVideoById(args);else e.target.cueVideoById(args)},onStateChange:e=>{if(e.target.isMuted&&!e.target.isMuted())e.target.mute()},onError:()=>{stop();message('این ویدئو قابلیت پخش تعبیه‌شده ندارد؛ منبع دیگری انتخاب کن.',true)},onAutoplayBlocked:()=>{stop();message('مرورگر پخش خودکار YouTube را مسدود کرد؛ روی ▶ داخل خود پخش‌کننده بزن.',true)}}})}
  else {S.player.mute();if(playing)S.player.loadVideoById(args);else S.player.cueVideoById(args)}
  S.videoId=opt.id;S.loadedClip=index;if(playing)message('در حال پیش‌نمایش برش '+(index+1)+' با صدای ویدئوی خاموش و نریشن اصلی.');
 }catch(err){message(err.message,true)}
}
function stop(stopPlayer=true){
 S.active=false;clearInterval(S.timer);S.timer=null;
 if(S.voice&&!S.voice.paused)S.voice.pause();
 if(stopPlayer)try{S.player?.pauseVideo?.()}catch(_){}
 if(!window.rfSmartEditHasClips?.())$('play').textContent='▶';
}
function currentTime(){
 return S.voiceFile&&S.voice?S.voice.currentTime:Math.max(0,(performance.now()-S.startPerf)/1000)
}
function seekVirtual(t){
 if(!S.items.length)return;
 const total=Math.max(S.duration,durationTotal());t=clamp(t,0,total-.01);
 const wasActive=S.active;stop();updateClock(t);
 const ix=S.items.findIndex(x=>t>=x.start&&t<x.start+x.duration);
 if(ix>=0)showClip(ix,false,t-S.items[ix].start);
 if(wasActive)start(t);
}
function playbackTick(){
 if(!S.active)return;
 const t=currentTime(),total=Math.max(S.duration,durationTotal());updateClock(t);
 try{S.player?.mute?.()}catch(_){}
 const ix=S.items.findIndex(x=>t>=x.start&&t<x.start+x.duration);
 if(ix<0&&S.loadedClip!==-1){try{S.player?.pauseVideo?.()}catch(_){}S.loadedClip=-1}
 if(ix>=0&&(ix!==S.selected||S.loadedClip===-1))showClip(ix,true,t-S.items[ix].start);
 if(ix>=0&&ix===S.selected&&S.player?.getCurrentTime){const cur=S.player.getCurrentTime();const target=S.items[ix].sourceStart+(t-S.items[ix].start);
  if(Number.isFinite(cur)&&cur>0&&Math.abs(cur-target)>2.3)S.player.seekTo(target,true);
 }
 if(t>=total-.05){stop();updateClock(total)}
}
function start(at=0){
 if(!S.items.length){message('ابتدا کات‌های پیشنهادی را بساز.',true);return}
 stop();const total=Math.max(S.duration,durationTotal());if(at>=total-.1)at=0;
 const ix=Math.max(0,S.items.findIndex(x=>at>=x.start&&at<x.start+x.duration));
 S.startPerf=performance.now()-at*1000;S.active=true;S.selected=-1;
 $('play').textContent='❚❚';updateClock(at);
 // Start narration on the user gesture BEFORE awaiting loading YouTube's IFrame API.
 if(S.voiceFile&&S.voice){try{S.voice.currentTime=at;S.voice.play().catch(e=>{message('پخش نریشن مسدود شد: '+e.message,true);stop()})}catch(e){message(e.message,true)}}
 showClip(ix,true,at-S.items[ix].start);
 S.timer=setInterval(playbackTick,160);
}
$('rfYTPlay').addEventListener('click',()=>S.active?stop():start(0));$('rfYTPause').addEventListener('click',()=>stop());
// The main preview controls manage virtual YouTube edits when there is no locally downloadable video.
$('play').addEventListener('click',e=>{if(!S.items.length||window.rfSmartEditHasClips?.())return;e.stopImmediatePropagation();if(S.active)stop();else start(S.lastTime)},true);
for(const [id,delta] of [['back',-5],['forward',5]])$(id).addEventListener('click',e=>{if(!S.items.length||window.rfSmartEditHasClips?.())return;e.stopImmediatePropagation();seekVirtual(S.lastTime+delta)},true);
$('scrubRail').addEventListener('click',e=>{if(!S.items.length||window.rfSmartEditHasClips?.())return;e.stopImmediatePropagation();const r=e.currentTarget.getBoundingClientRect();seekVirtual((e.clientX-r.left)/r.width*Math.max(S.duration,durationTotal()))},true);

function reset(){stop();++S.playToken;S.items=[];S.selected=-1;S.duration=0;S.loadedClip=-1;try{S.player?.stopVideo?.()}catch(_){}overlay.hidden=true;renderReferences();updateClock(0);message('برش‌های مجازی پاک شدند؛ فایل‌های شخصی تغییر نکردند.')}
$('rfYTClear').addEventListener('click',reset);// Clear references explicitly; the original new-project confirmation remains untouched.
function splitAt(at){const i=S.items.findIndex(it=>at>it.start+0.4&&at<it.start+it.duration-0.4);if(i<0)return message('برای تقسیم، نشانگر را داخل برش بگذار یا دکمه تقسیم وسط برش را بزن.',true);stop();const a=S.items[i],len=at-a.start;const b={...a,id:S.clipId++,start:at,duration:a.duration-len,sourceStart:a.sourceStart+len,sourceEnd:a.sourceStart+a.duration};a.duration=len;a.sourceEnd=a.sourceStart+len;S.items.splice(i+1,0,b);renderReferences();setSelection(i+1);message('برش مجازی در '+fmt(at)+' تقسیم شد؛ صدای ویدئوها خاموش است.')}
$('rfYTSplit')?.addEventListener('click',()=>{const t=S.voice?.currentTime||0;const i=S.selected;const v=S.items[i];const at=S.active?t:v?v.start+v.duration/2:-1;splitAt(at)});
$('rfYTPlan').onclick=()=>{if(!S.items.length)return message('هنوز برشی ساخته نشده.',true);const data={type:'RushFinder YouTube Virtual Cut Storyboard — not MP4',version:'0927',renderableMP4:false,voiceSeconds:S.duration,clips:S.items.map(it=>({sentence:it.sentence,query:it.query,timelineStart:it.start,timelineDuration:it.duration,sourceStart:it.sourceStart,sourceEnd:it.sourceEnd,source:it.options[it.optionIndex||0],verifiedByHuman:false}))};const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='RushFinder-0927-YouTube-Cut-Storyboard.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)};
// Embedded YouTube clips cannot be included in MediaRecorder MP4/WebM output.
for(const b of [$('exportBtn'),$('rfExportSide')])b?.addEventListener('click',e=>{if(S.items.length&&!confirm('برش‌های یوتیوب فقط مجازی هستند و داخل خروجی MP4 یا WebM نمی‌آیند. ادامه می‌دهی؟')){e.preventDefault();e.stopImmediatePropagation()}},true);
btn.onclick=async()=>{
 const text=$('script').value.trim();if(!text)return message('متن نریشن را وارد کن.',true);
 const parts=sentences(text);if(!parts.length)return message('متن کافی نیست.',true);
 btn.disabled=true;reset();message('در حال جست‌وجوی فیلم برای '+parts.length+' بخش نریشن…');
 try{
  let dur=S.voiceFile?await probeVoice(S.voiceFile):0;if(!dur)dur=parts.reduce((n,p)=>n+p.split(/\s+/).length,0)/2.3;
  dur=clamp(dur,5,420);const steps=beats(parts,dur),suggested=[],errors=[],cache=new Map();let requests=0;
  for(let i=0;i<parts.length;i++){
   const query=searchQuery(parts[i]);message('جست‌وجوی موضوع '+(i+1)+' از '+parts.length+' · '+query);
   let options=cache.get(query)||[];
   if(!cache.has(query)&&requests<12){requests++;
    try{const resp=await fetch('/api/youtube-music?mode=smartedit&q='+encodeURIComponent(query),{headers:{Accept:'application/json'}});
     const data=await resp.json();if(!resp.ok)throw Error(data.error||'HTTP '+resp.status);
     options=sortedOptions(data.items||[],query)
    }catch(e){errors.push('بخش '+(i+1)+': '+e.message)}
    cache.set(query,options);
   }
   if(!options.length){errors.push('برای بخش '+(i+1)+' فیلمی پیدا نشد.');continue}
   const beat=steps[i],count=Math.min(42,Math.max(1,Math.ceil(beat.duration/5.4)));
   for(let c=0;c<count;c++){
    const piece=beat.duration/count;let chosen=(i+c)%options.length;
    for(let retry=0;retry<options.length;retry++){
     const v=options[(chosen+retry)%options.length];if(!v.durationSeconds||v.durationSeconds>piece+1.5){chosen=(chosen+retry)%options.length;break}
    }
    const v=options[chosen],maxStart=v.durationSeconds?Math.max(0,v.durationSeconds-piece-.3):90;
    // These are preview start points, not scene recognition. Keep them inside known video duration.
    const sourceStart=Math.min(maxStart,4+Math.floor(c/options.length)*9+(i%3)*3);
    suggested.push({id:S.clipId++,sentence:parts[i],query,start:beat.start+c*piece,duration:piece,sourceStart,sourceEnd:sourceStart+piece,options,optionIndex:chosen,unverified:v.rank<=0});
   }
  }
  S.items=suggested;S.duration=dur;S.selected=suggested.length?0:-1;renderReferences();updateClock(0);
  if(suggested.length)await showClip(0,false,0);
  message('✓ '+suggested.length+' کات قابل پخش روی نوار ویدئو چیده شد؛ '+requests+' جست‌وجو و حداکثر '+Math.max(0,...[...cache.values()].map(x=>x.length))+' منبع برای هر موضوع. روی ▶ اصلی بزن. ⚠ این کات‌ها مجازی‌اند، دانلود یا MP4 نمی‌شوند. '+(errors.length?'بعضی بخش‌ها نتیجه نداشتند: '+errors.slice(0,3).join(' | '):''),!suggested.length);
 }catch(e){message('خطا: '+e.message,true)}finally{btn.disabled=false}
};

window.rfYTStopPreview=()=>{stop();overlay.hidden=true};
window.rfYTPreviewState=()=>({count:S.items.length,duration:S.duration,active:S.active,sourceCount:new Set(S.items.map(it=>it.options[it.optionIndex||0]?.id)).size});
renderInspector();message('متن و نریشن را وارد کن؛ دکمه جست‌وجو برش‌های مجازی قابل تنظیم روی تایم‌لاین می‌چیند.');
window.addEventListener('beforeunload',()=>{stop();if(S.voiceURL)URL.revokeObjectURL(S.voiceURL)});
})();
