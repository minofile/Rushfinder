(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false});
const media=new Map();let clips=[],titles=[],audioTracks={music:null,voice:null};
let selected=null,playheadTime=0,isPlaying=false,renderId=0,playClock=0,zoom=44,transition='fade',muted=false;
let history=[],audioCtx=null,audioDest=null,exporting=false,recorder=null,recordedChunks=[],cancelRecording=false,outputBlob=null,outputName='';
let micRecorder=null,micStream=null;const PADDING=36,FA='۰۱۲۳۴۵۶۷۸۹';
const uid=()=>Math.random().toString(36).slice(2,10);const pad=n=>String(n).padStart(2,'0');
const fa=x=>String(x).replace(/[0-9]/g,d=>FA[Number(d)]);
const fmt=t=>`${pad(Math.floor(Math.max(0,t)/60))}:${pad(Math.floor(Math.max(0,t)%60))}`;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const escapeText=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=s=>{$('status').textContent=s};
function snapshot(){history.push({clips:clips.map(c=>({id:c.id,mediaId:c.mediaId,in:c.in,out:c.out,speed:c.speed})),titles:titles.map(t=>({...t})),audios:Object.fromEntries(Object.entries(audioTracks).map(([k,v])=>[k,v?{mediaId:v.mediaId,volume:v.volume,offset:v.offset,in:v.in,out:v.out}:null])),selected:selected?{...selected}:null,transition});if(history.length>25)history.shift()}
function createClip(m,from=0,to=null,speed=1){const c={id:uid(),mediaId:m.id,in:from,out:to??m.duration,speed,volume:0};makeClipEl(c);return c}
function makeClipEl(c){const m=media.get(c.mediaId);if(!m)return;if(m.type==='video'){let v=document.createElement('video');v.src=m.url;v.preload='auto';v.playsInline=true;v.crossOrigin='anonymous';v.muted=true;c.el=v;attachAudio(v,0)}else if(m.type==='image')c.el=m.img}
function ensureAudio(){if(audioCtx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();audioDest=audioCtx.createMediaStreamDestination();clips.forEach(c=>{if(c.el?.tagName==='VIDEO')attachAudio(c.el,0)});Object.values(audioTracks).forEach(t=>{if(t?.el)attachAudio(t.el,t.volume)})}
function attachAudio(el,volume=1){if(!audioCtx||el._rfAudio)return;try{const source=audioCtx.createMediaElementSource(el),gain=audioCtx.createGain();gain.gain.value=volume;source.connect(gain);gain.connect(audioCtx.destination);gain.connect(audioDest);el._rfAudio={source,gain};}catch(e){console.warn('audio:',e)}}
function clipLength(c){return Math.max(.05,(c.out-c.in)/c.speed)}
function bounds(){let start=0;return clips.map((c,i)=>{const d=clipLength(c);const overlap=(transition!=='cut'&&i>0)?Math.min(.5,clipLength(clips[i-1])*.23,d*.23):0;start-=overlap;const b={clip:c,start,end:start+d,duration:d,overlap};start+=d;return b})}
function duration(){const b=bounds();return b.length?b[b.length-1].end:0}
function pauseAll(){clips.forEach(c=>c.el?.pause?.());Object.values(audioTracks).forEach(a=>a?.el?.pause?.())}
function synchronize(t,playing){const active=bounds().filter(b=>t>=b.start-.03&&t<b.end+.03), activeIds=new Set(active.map(b=>b.clip.id));
 for(const c of clips){if(c.el?.tagName!=='VIDEO')continue;const b=active.find(b=>b.clip.id===c.id);if(!b){c.el.pause();continue}const wanted=clamp(c.in+(t-b.start)*c.speed,c.in,Math.max(c.in,c.out-.02));try{if(Math.abs(c.el.currentTime-wanted)>.18)c.el.currentTime=wanted}catch(_e){}c.el.playbackRate=c.speed;c.el.muted=true;if(c.el._rfAudio)c.el._rfAudio.gain.gain.value=0;
  if(playing&&c.el.paused)c.el.play().catch(()=>{});else if(!playing&&!c.el.paused)c.el.pause();}
 for(const key of ['music','voice']){const a=audioTracks[key];if(!a?.el)continue;const within=t>=a.offset&&t<a.offset+(a.out-a.in);const target=clamp(a.in+t-a.offset,a.in,Math.max(a.in,a.out-.03));if(within){try{if(Math.abs(a.el.currentTime-target)>.24)a.el.currentTime=target}catch(_e){}if(a.el._rfAudio)a.el._rfAudio.gain.gain.value=muted?0:a.volume;else a.el.volume=muted?0:a.volume;if(playing&&a.el.paused)a.el.play().catch(()=>{});else if(!playing&&!a.el.paused)a.el.pause();}else a.el.pause();}
}
function drawCover(el,alpha=1){if(!el)return;let w=el.videoWidth||el.naturalWidth||0,h=el.videoHeight||el.naturalHeight||0;if(!w||!h)return;const W=canvas.width,H=canvas.height;const scale=Math.max(W/w,H/h),tw=w*scale,th=h*scale;ctx.globalAlpha=alpha;try{ctx.drawImage(el,(W-tw)/2,(H-th)/2,tw,th)}catch(_e){}ctx.globalAlpha=1}
function drawTextBlock(txt,yPct=.79){const W=canvas.width,H=canvas.height;const base=canvas.width>canvas.height?37:44;ctx.save();ctx.textAlign='center';ctx.direction='rtl';ctx.font=`bold ${base}px RushVazir0923, Vazir, Tahoma, sans-serif`;const width=W*.86;const lines=[];let part='';for(const word of txt.split(/\s+/).filter(Boolean)){const candidate=part?part+' '+word:word;if(ctx.measureText(candidate).width>width&&part){lines.push(part);part=word}else part=candidate}if(part)lines.push(part);const displayed=lines.slice(0,4),lineH=base*1.4,boxH=displayed.length*lineH+27;const center=H*yPct;ctx.fillStyle='#061325cc';ctx.fillRect(W*.035,center-boxH/2,W*.93,boxH);ctx.fillStyle='#ffffff';ctx.shadowColor='#000';ctx.shadowBlur=7;displayed.forEach((line,i)=>ctx.fillText(line,W/2,center-boxH/2+lineH*(i+.75)));ctx.restore()}
function paint(t){const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle='#05090f';ctx.fillRect(0,0,W,H);const active=bounds().filter(b=>t>=b.start&&t<b.end);if(active.length){const first=active[0];drawCover(first.clip.el,1);if(active.length>1){const second=active[1],k=clamp((t-second.start)/Math.max(.05,second.overlap),0,1);
  if(transition==='slide'){ctx.save();ctx.translate(W*(1-k),0);drawCover(second.clip.el,1);ctx.restore()}
  else if(transition==='zoom'){ctx.save();ctx.translate(W/2,H/2);const s=.72+.28*k;ctx.scale(s,s);ctx.translate(-W/2,-H/2);drawCover(second.clip.el,k);ctx.restore()}
  else if(transition==='wipe'){ctx.save();ctx.beginPath();ctx.rect(0,0,W*k,H);ctx.clip();drawCover(second.clip.el,1);ctx.restore()}
  else drawCover(second.clip.el,k);
 }}else if(clips.length===0){ctx.font='bold 30px RushVazir0923, Vazir, Tahoma, sans-serif';ctx.fillStyle='#b5cce5';ctx.textAlign='center';ctx.fillText('راش‌ها را وارد کن و تدوین را شروع کن',W/2,H/2);ctx.font='18px RushVazir0923, Vazir, Tahoma, sans-serif';ctx.fillStyle='#7693b7';ctx.fillText('پیش‌نمایش پروژه اینجا نمایش داده می‌شود',W/2,H/2+40)}else{ctx.font='18px RushVazir0923, Vazir, Tahoma, sans-serif';ctx.fillStyle='#8096b2';ctx.textAlign='center';ctx.fillText('در حال آماده‌سازی فریم…',W/2,H/2)}
 titles.filter(title=>t>=title.start&&t<title.start+title.length).forEach(title=>drawTextBlock(title.text));}
function updateTimeUI(){const total=duration();$('time').textContent=`${fmt(playheadTime)} / ${fmt(total)}`;$('scrubFill').style.width=(total?clamp(playheadTime/total*100,0,100):0)+'%';$('playhead').style.left=(playheadTime*zoom+PADDING)+'px'}
function seek(t){const was=isPlaying;if(was)stopPlayback();playheadTime=clamp(t,0,duration());synchronize(playheadTime,false);paint(playheadTime);updateTimeUI();if(was)startPlayback()}
function tick(){if(!isPlaying)return;playheadTime=clamp((performance.now()-playClock)/1000,0,duration());synchronize(playheadTime,true);paint(playheadTime);updateTimeUI();if(exporting){const pct=duration()?playheadTime/duration()*100:0;$('exportProgress').value=pct;$('modalText').textContent=`در حال ساخت خروجی روی همین کامپیوتر... ${fa(Math.floor(pct))}٪ · ${fmt(playheadTime)} / ${fmt(duration())}`;}
 if(playheadTime>=duration()-.015){stopPlayback();if(exporting&&recorder&&recorder.state!=='inactive')recorder.stop();return}
 renderId=requestAnimationFrame(tick)}
async function startPlayback(){if(!clips.length)return;window.rfYTStopPreview?.();ensureAudio();try{await audioCtx?.resume?.()}catch(_e){}if(playheadTime>=duration()-.05)playheadTime=0;isPlaying=true;playClock=performance.now()-playheadTime*1000;$('play').textContent='❚❚';synchronize(playheadTime,true);cancelAnimationFrame(renderId);renderId=requestAnimationFrame(tick)}
function stopPlayback(){isPlaying=false;cancelAnimationFrame(renderId);$('play').textContent='▶';pauseAll();}
$('play').addEventListener('click',()=>isPlaying?stopPlayback():startPlayback());$('back').onclick=()=>seek(playheadTime-5);$('forward').onclick=()=>seek(playheadTime+5);$('muteBtn').onclick=()=>{muted=!muted;$('muteBtn').textContent=muted?'🔇':'🔊';synchronize(playheadTime,isPlaying)};
$('scrubRail').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();seek((e.clientX-r.left)/r.width*duration())});
function layoutPreviewFrame(){
 const stage=$('stage'),frame=$('rfPreviewFrame');if(!stage||!frame)return;
 const rect=stage.getBoundingClientRect(),cs=getComputedStyle(stage);
 const freeW=Math.max(100,rect.width-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0));
 const freeH=Math.max(100,rect.height-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0));
 const r=canvas.width/canvas.height;
 const width=Math.min(freeW,freeH*r),height=width/r;
 frame.style.width=width+'px';frame.style.height=height+'px';
}
$('aspect').onchange=()=>{const ratio=$('aspect').value;if(ratio==='9:16'){canvas.width=540;canvas.height=960}else if(ratio==='1:1'){canvas.width=720;canvas.height=720}else{canvas.width=960;canvas.height=540}canvas.style.aspectRatio=`${canvas.width}/${canvas.height}`;layoutPreviewFrame();paint(playheadTime)};
if(window.ResizeObserver)new ResizeObserver(layoutPreviewFrame).observe($('stage'));else window.addEventListener('resize',layoutPreviewFrame);
requestAnimationFrame(layoutPreviewFrame);
window.rfSmartEditHasClips=()=>clips.length>0;
function pushClip(c){snapshot();clips.push(c);selected={type:'video',id:c.id};afterChange('کلیپ به تایم‌لاین اضافه شد')}
function afterChange(msg){stopPlayback();if(clips.length)window.rfYTStopPreview?.();playheadTime=clamp(playheadTime,0,duration());renderTimeline();window.dispatchEvent(new Event('rfTimelineChanged'));renderInspector();paint(playheadTime);updateTimeUI();if(msg)status(msg)}
function addMediaToTimeline(id){const m=media.get(id);if(!m)return;if(m.type==='audio'){setAudio('music',id);return}pushClip(createClip(m))}
function metadata(file){return new Promise(resolve=>{const url=URL.createObjectURL(file),kind=file.type.startsWith('audio/')?'audio':file.type.startsWith('image/')?'image':'video';if(kind==='image'){const im=new Image();im.onload=()=>resolve({url,type:'image',duration:4,img:im,width:im.naturalWidth,height:im.naturalHeight});im.onerror=()=>resolve(null);im.src=url;}else{const el=document.createElement(kind==='audio'?'audio':'video');el.preload='metadata';const tm=setTimeout(()=>resolve(null),18000);el.onloadedmetadata=()=>{clearTimeout(tm);resolve({url,type:kind,duration:Number.isFinite(el.duration)?Math.min(100000,el.duration):10,width:el.videoWidth||0,height:el.videoHeight||0})};el.onerror=()=>{clearTimeout(tm);resolve(null)};el.src=url;el.load()}})}
async function importFile(file,makeAudio=null){if(!file)return;status('در حال بررسی فایل '+file.name);const props=await metadata(file);if(!props){status('خواندن فایل ممکن نشد: '+file.name);return null}const id=uid(),m={id,file,name:file.name,...props,rfTopics:[],rfTitle:''};media.set(id,m);renderAssets();status('رسانه اضافه شد: '+file.name);if(makeAudio)setAudio(makeAudio,id);return m}
$('files').onchange=async e=>{const fs=[...e.target.files];for(const file of fs)await importFile(file);e.target.value=''};
$('musicInput').onchange=async e=>{await importFile(e.target.files[0],'music');e.target.value=''};
$('voiceInput').onchange=async e=>{await importFile(e.target.files[0],'voice');e.target.value=''};

// RushFinder SmartEdit 0912: narration is the primary timeline clock.
async function rf0912ImportNarration(file){
 if(!file)return null;
 const label=$('autoVoiceInfo');label.dataset.loaded='0';label.textContent='در حال خواندن فایل نریشن…';
 const m=await importFile(file,'voice');
 if(m && m.type==='audio' && Number.isFinite(m.duration) && m.duration>0){
   audioTracks.voice.offset=0;audioTracks.voice.volume=.96;
   label.dataset.loaded='1';label.textContent=`✓ نریشن آماده: ${m.name} · ${fmt(m.duration)} · زمان تدوین از روی همین صدا محاسبه می‌شود.`;
   renderTimeline();return m;
 }
 label.textContent='خواندن نریشن ناموفق بود؛ MP3 یا WAV معتبر انتخاب کن.';return null;
}
window.rf0912ImportNarration=rf0912ImportNarration;
$('autoVoiceInput').onchange=async e=>{await rf0912ImportNarration(e.target.files?.[0]);e.target.value=''};
$('autoMusicInput').onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 const m=await importFile(f,'music');
 $('autoMusicInfo').textContent=m?`✓ موسیقی انتخاب‌شده: ${m.name}`:'فایل موسیقی خوانده نشد.';
 if(m)audioTracks.music.volume=.13;
 e.target.value='';
};
function narrationBeats(lines,voiceSec,style){
 // Evenly spaced scene cues approximate alignment. Word-level alignment needs speech recognition.
 const target=style==='social'?3.4:style==='cinema'?5.8:4.5;
 const count=clamp(Math.ceil(voiceSec/target),1,90);
 const words=lines.map(s=>Math.max(1,s.trim().split(/\s+/).length));
 const sum=words.reduce((a,b)=>a+b,0),cum=[];let acc=0;for(const w of words){acc+=w;cum.push(acc/sum)}
 return Array.from({length:count},(_,i)=>{
  const p=(i+.5)/count;let index=cum.findIndex(v=>p<=v);if(index<0)index=lines.length-1;
  return {line:lines[index],seconds:voiceSec/count};
 });
}
function renderAssets(){const root=$('assets');root.innerHTML='';for(const m of media.values()){const d=document.createElement('div');d.className='asset';d.draggable=true;d.title='به تایم‌لاین بکش یا روی افزودن بزن';d.innerHTML=`<div class="asset-thumb">${m.type==='video'?'▶':m.type==='image'?'▧':'♫'}</div><div class="asset-title">${escapeText(m.name)}</div><small>${fmt(m.duration)} · ${m.type==='video'?'ویدئو':m.type==='audio'?'صدا':'عکس'}</small><br><button type="button">＋ افزودن</button>`;d.querySelector('button').onclick=()=>addMediaToTimeline(m.id);d.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain','media:'+m.id));root.appendChild(d)}if(!media.size)root.innerHTML='<div class="empty" style="grid-column:1/-1">هنوز فایلی انتخاب نشده است.</div>'}
function makeAudio(mediaId,type){const m=media.get(mediaId);const a={mediaId,volume:type==='music'?.3:.85,offset:0,in:0,out:m.duration};a.el=new Audio(m.url);a.el.preload='auto';a.el._rfAudio=null;attachAudio(a.el,a.volume);return a}
function setAudio(type,id){snapshot();audioTracks[type]?.el?.pause?.();audioTracks[type]=makeAudio(id,type);selected={type,id};afterChange(type==='music'?'موسیقی در لایه خودش قرار گرفت':'نریشن در لایه خودش قرار گرفت')}
function renderTimeline(){const d=duration(),width=Math.max(880,Math.ceil((d+4)*zoom+PADDING*2));$('timeline').style.width=width+'px';$('ruler').innerHTML='';for(let s=0;s<=Math.ceil(d+4);s+=s<30?5:10){const b=document.createElement('div');b.className='tick';b.style.left=(PADDING+s*zoom)+'px';b.textContent=fmt(s);$('ruler').appendChild(b)}
 for(const name of ['title','video','music','voice']){const row=$(name+'Track');row.innerHTML='';let had=false;const nodes=[];
 if(name==='video'){for(const b of bounds()){const m=media.get(b.clip.mediaId);nodes.push({id:b.clip.id,type:name,from:b.start,len:b.duration,label:m?.name||'راش'})}}
 else if(name==='title'){for(const t of titles)nodes.push({id:t.id,type:name,from:t.start,len:t.length,label:t.text})}
 else {const a=audioTracks[name];if(a){nodes.push({id:name,type:name,from:a.offset,len:a.out-a.in,label:media.get(a.mediaId)?.name||name})}}
 for(const data of nodes){had=true;const item=document.createElement('div');item.className=`clip ${name==='video'?(media.get(clips.find(c=>c.id===data.id)?.mediaId)?.type==='image'?'image-clip':'video-clip'):name+'-clip'}`;item.classList.toggle('active',selected?.type===data.type&&selected?.id===data.id);item.style.left=(PADDING+data.from*zoom)+'px';item.style.width=Math.max(28,data.len*zoom-2)+'px';item.textContent=data.label;item.title=`${data.label} — ${fmt(data.len)}`;item.draggable=name==='video';item.dataset.id=data.id;const badge=document.createElement('span');badge.className='duration-chip';badge.textContent=fmt(data.len);item.appendChild(badge);item.addEventListener('click',e=>{e.stopPropagation();selected={type:name,id:data.id};renderTimeline();renderInspector()});if(name==='video'){item.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain','clip:'+data.id));}row.appendChild(item)}row.classList.toggle('has-content',had);if(!had){const hint=document.createElement('div');hint.className='drop-hint';hint.textContent={video:'راش‌ها را از کتابخانه اینجا بکش',title:'لایه متن',music:'موسیقی زمینه',voice:'نریشن'}[name];row.appendChild(hint)}}

 // Show each applied transition on its own timeline row.
 const tr=$('transitionTrack');if(tr){tr.innerHTML='';const bs=bounds();
 for(let i=1;i<bs.length;i++){
  if(transition==='cut')break;
  const b=bs[i],marker=document.createElement('button');marker.type='button';marker.className='trans-marker';
  marker.style.left=(PADDING+b.start*zoom-14)+'px';marker.textContent=({fade:'◩',slide:'➜',zoom:'⤢',wipe:'▥'}[transition]||'◇');
  marker.title='ترنزیشن '+(transitionLabels[transition]||'محو');marker.onclick=()=>{seek(b.start+b.overlap*.5)};
  tr.appendChild(marker);
 }
 tr.classList.toggle('has-content',bs.length>1&&transition!=='cut');
 if(!tr.classList.contains('has-content'))tr.innerHTML='<div class="drop-hint">ترنزیشن‌ها بین نماها</div>';
 }
 updateTimeUI()}
$('ruler').onclick=e=>{const x=e.clientX-e.currentTarget.getBoundingClientRect().left;seek((x-PADDING)/zoom)};
$('videoTrack').addEventListener('dragover',e=>e.preventDefault());$('videoTrack').addEventListener('drop',e=>{e.preventDefault();const data=e.dataTransfer.getData('text/plain'),pos=clamp((e.clientX-e.currentTarget.getBoundingClientRect().left-PADDING)/zoom,0,duration());if(data.startsWith('media:')){const id=data.slice(6),m=media.get(id);if(!m||m.type==='audio')return;snapshot();const insert=bounds().findIndex(b=>pos<b.start+b.duration/2);const c=createClip(m);clips.splice(insert<0?clips.length:insert,0,c);selected={type:'video',id:c.id};afterChange('راش به تایم‌لاین اضافه شد')}else if(data.startsWith('clip:')){const id=data.slice(5),old=clips.findIndex(c=>c.id===id);if(old<0)return;snapshot();const [c]=clips.splice(old,1),insert=bounds().findIndex(b=>pos<b.start+b.duration/2);clips.splice(insert<0?clips.length:insert,0,c);selected={type:'video',id};afterChange('ترتیب نماها جابه‌جا شد')}});
$('zoom').oninput=e=>{zoom=+e.target.value;$('zoomValue').textContent=zoom+'px/s';renderTimeline()};
function split(){if(!clips.length)return;const b=bounds().find(b=>playheadTime>b.start+.1&&playheadTime<b.end-.1);if(!b){status('نشانگر را داخل یک کلیپ قرار بده');return}const cut=clamp(b.clip.in+(playheadTime-b.start)*b.clip.speed,b.clip.in,b.clip.out);if(cut-b.clip.in<.15||b.clip.out-cut<.15)return;snapshot();const ix=clips.findIndex(c=>c.id===b.clip.id);const next=createClip(media.get(b.clip.mediaId),cut,b.clip.out,b.clip.speed);b.clip.out=cut;clips.splice(ix+1,0,next);selected={type:'video',id:next.id};afterChange('کلیپ از محل نشانگر جدا شد')}
$('split').onclick=split;
function removeSelected(){if(!selected)return;snapshot();if(selected.type==='video'){const i=clips.findIndex(c=>c.id===selected.id);if(i>-1){clips[i].el?.pause?.();clips.splice(i,1)}}else if(selected.type==='title')titles=titles.filter(t=>t.id!==selected.id);else if(selected.type==='music'||selected.type==='voice'){audioTracks[selected.type]?.el?.pause?.();audioTracks[selected.type]=null}selected=null;afterChange('مورد انتخاب‌شده حذف شد')}
$('remove').onclick=removeSelected;
function undo(){const entry=history.pop();if(!entry){status('تغییری برای بازگردانی وجود ندارد');return}pauseAll();clips=entry.clips.map(c=>{const copy={...c};makeClipEl(copy);return copy});titles=entry.titles;audioTracks=Object.fromEntries(Object.entries(entry.audios).map(([k,v])=>[k,v?Object.assign(makeAudio(v.mediaId,k),v):null]));selected=entry.selected;transition=entry.transition;syncTransitionButtons();afterChange('آخرین تغییر بازگردانده شد')}
$('undo').onclick=undo;
const transitionLabels={fade:'محو',slide:'اسلاید',zoom:'زوم',wipe:'وایپ',cut:'کات'};
const transitionOrder=['fade','slide','zoom','wipe','cut'];
function syncTransitionButtons(){
 $('transition').textContent='◇ ترنزیشن: '+(transitionLabels[transition]||'محو');
 document.querySelectorAll('[data-transition-preset]').forEach(btn=>{const on=btn.dataset.transitionPreset===transition;btn.classList.toggle('is-selected',on);btn.setAttribute('aria-pressed',String(on))});
}
function setTransitionPreset(next){if(!transitionOrder.includes(next)||next===transition)return;snapshot();transition=next;syncTransitionButtons();afterChange('ترنزیشن: '+transitionLabels[next])}
$('transition').onclick=()=>setTransitionPreset(transitionOrder[(transitionOrder.indexOf(transition)+1)%transitionOrder.length]);
document.querySelectorAll('[data-transition-preset]').forEach(btn=>btn.addEventListener('click',()=>setTransitionPreset(btn.dataset.transitionPreset)));
syncTransitionButtons();
function inspectorField(label,input){return `<div class="field"><label>${label}</label>${input}</div>`}
function renderInspector(){const r=$('inspectorContent');if(!selected){$('selectTag').textContent='چیزی انتخاب نشده';r.innerHTML='<div class="empty">یک کلیپ را از تایم‌لاین انتخاب کن.<br>اینجا می‌توانی آن را کوتاه کنی، سرعت را تغییر بدهی یا صدایش را تنظیم کنی.</div>';return}
 $('selectTag').textContent=selected.type==='video'?'راش':selected.type==='title'?'متن':selected.type==='music'?'موسیقی':'نریشن';
 if(selected.type==='video'){const c=clips.find(c=>c.id===selected.id);if(!c){selected=null;return renderInspector()}const m=media.get(c.mediaId);r.innerHTML=`<div class="section"><h3>${escapeText(m.name)}</h3><div class="tag">${m.type==='image'?'عکس':'ویدئو'} · ${fmt(clipLength(c))}</div>${inspectorField('شروع از ثانیه فایل اصلی',`<input id="inVal" type="number" step="0.1" min="0" max="${(c.out-.1).toFixed(2)}" value="${c.in.toFixed(2)}">`)}${inspectorField('پایان در ثانیه فایل اصلی',`<input id="outVal" type="number" step="0.1" min="${(c.in+.1).toFixed(2)}" max="${m.duration.toFixed(2)}" value="${c.out.toFixed(2)}">`)}${inspectorField('سرعت پخش',`<select id="speedVal"><option value=".5">نیم‌برابر (0.5×)</option><option value="1">معمولی (1×)</option><option value="1.5">تند (1.5×)</option><option value="2">دوبرابر (2×)</option></select>`)}${m.type==='video'?inspectorField('صدای راش (درصد)',`<input id="clipVolume" type="range" min="0" max="100" value="${Math.round((c.volume??.85)*100)}">`):''}<button class="btn primary" id="trimSave" style="width:100%">اعمال تغییرات</button></div><div class="section"><h3>کارهای سریع</h3><div class="line"><button class="btn" id="copyClip">تکثیر کلیپ</button><button class="btn red" id="delClip">حذف</button></div></div>`;
 $('speedVal').value=String(c.speed);$('trimSave').onclick=()=>{const a=+$('inVal').value,b=+$('outVal').value,s=+$('speedVal').value;if(!(a>=0&&b>a+.05&&b<=m.duration+.01))return alert('زمان شروع و پایان معتبر نیست.');snapshot();c.in=a;c.out=b;c.speed=s;c.volume=$('clipVolume')? +$('clipVolume').value/100 : (c.volume??.85);afterChange('برش و سرعت ذخیره شد')};$('copyClip').onclick=()=>{snapshot();const ix=clips.findIndex(x=>x.id===c.id);const copy=createClip(m,c.in,c.out,c.speed);clips.splice(ix+1,0,copy);selected={type:'video',id:copy.id};afterChange('کلیپ کپی شد')};$('delClip').onclick=removeSelected;
 }else if(selected.type==='title'){const t=titles.find(x=>x.id===selected.id);if(!t){selected=null;return renderInspector()}r.innerHTML=`<div class="section"><h3>متن روی تصویر</h3>${inspectorField('عبارت',`<textarea id="overlayText" rows="4">${escapeText(t.text)}</textarea>`)}${inspectorField('شروع (ثانیه)',`<input id="titleStart" type="number" step="0.1" value="${t.start.toFixed(1)}">`)}${inspectorField('مدت نمایش (ثانیه)',`<input id="titleDuration" type="number" min=".4" step="0.1" value="${t.length.toFixed(1)}">`)}<button class="btn primary" id="saveTitle" style="width:100%">ثبت تغییرات</button></div><button class="btn red" id="delClip">حذف متن</button>`;$('saveTitle').onclick=()=>{snapshot();t.text=$('overlayText').value.trim();t.start=clamp(+$('titleStart').value,0,duration());t.length=clamp(+$('titleDuration').value,.4,40);afterChange('متن و زمان آن ویرایش شد')};$('delClip').onclick=removeSelected;
 }else {const key=selected.type,a=audioTracks[key];if(!a){selected=null;return renderInspector()}r.innerHTML=`<div class="section"><h3>${key==='music'?'موسیقی زمینه':'نریشن'}</h3><div class="note">${escapeText(media.get(a.mediaId)?.name||'')}</div>${inspectorField('میزان صدا',`<input id="volVal" type="range" min="0" max="100" value="${Math.round(a.volume*100)}">`)}<div class="hintline" id="volText">${Math.round(a.volume*100)}٪</div>${inspectorField('شروع در تایم‌لاین (ثانیه)',`<input id="audioOffset" type="number" min="0" step=".1" value="${a.offset.toFixed(1)}">`)}<button class="btn primary" id="saveAudio" style="width:100%">ثبت تنظیمات صدا</button></div><button class="btn red" id="delClip">حذف لایه صدا</button>`;$('volVal').oninput=()=>{$('volText').textContent=$('volVal').value+'٪';a.el._rfAudio&&(a.el._rfAudio.gain.gain.value=+$('volVal').value/100)};$('saveAudio').onclick=()=>{snapshot();a.volume=+$('volVal').value/100;a.offset=clamp(+$('audioOffset').value,0,duration());afterChange('تنظیمات صدا ذخیره شد')};$('delClip').onclick=removeSelected;}
}
function switchToAutoWithText(){
 const t=$('titleText').value.trim();if(t&&!$('script').value.trim())$('script').value=t;
 document.querySelector('[data-tab="auto"]').click();
 $('smartReport').textContent='متن خبر را در کادر بالا بررسی کن و روی «از متن، راش پیدا کن و تایم‌لاین بساز» بزن. بدون راش محلی یا اتصال به آرشیو آنلاین مجاز، هیچ ویدئویی برای تدوین موجود نیست.';
 $('script').focus();
}
$('moveTextToScript').onclick=switchToAutoWithText;
$('addTitle').onclick=()=>{const t=$('titleText').value.trim();if(!t)return alert('اول متن را بنویس.');if(!clips.length){switchToAutoWithText();return;}snapshot();const title={id:uid(),text:t,start:clamp(playheadTime,0,duration()),length:Math.min(4,Math.max(.5,duration()-playheadTime))};titles.push(title);selected={type:'title',id:title.id};afterChange('متن روی ویدئو اضافه شد');$('titleText').value=''};
[...document.querySelectorAll('[data-tab]')].forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t===b));['media','text','audio','auto'].forEach(tab=>$(tab+'Tab').classList.toggle('hidden',tab!==b.dataset.tab))});
// SmartEdit 0906: local file-title relevance and opt-in licensed stock lookup.
const EDIT_STOP=new Set('در از به با را برای که این آن یک و یا می شود شده است بود هستند روی خود ما شما فیلم ویدئو خبر گزارش تصاویر تصویر تازه درباره های ها همچنین نیز پس قبل بعد همان اما اگر سپس تا راش'.split(' '));
const SYNONYMS={
'باران':['rain','rainy','weather'],'بارش':['rain','rainfall'],'سیل':['flood','flooding'],'تهران':['tehran','iran','city'],'ترافیک':['traffic','cars','street'],
'اقتصاد':['economy','business','finance'],'بازار':['market','bazaar','business'],'بورس':['stock','trading','finance'],'دلار':['dollar','currency','money'],
'آتش':['fire','flames'],'آتش‌سوزی':['fire','burning'],'امداد':['rescue','emergency','ambulance'],'بیمارستان':['hospital','medical'],
'فوتبال':['football','soccer','stadium'],'ورزش':['sport','sports','fitness'],'دانشگاه':['university','students','campus'],
'مدرسه':['school','students'],'دانش‌آموز':['students','school'],'فناوری':['technology','tech','computer'],
'هوش':['ai','technology'],'مصنوعی':['ai','robot','computer'],'موبایل':['mobile','phone','smartphone'],
'فضا':['space','earth','satellite'],'پزشکی':['medical','hospital','doctor'],'سلامت':['health','hospital'],
'زمین':['earth','nature'],'زلزله':['earthquake','disaster'],'محیط':['nature','environment'],'گردشگری':['travel','tourism'],
'طبیعت':['nature','landscape'],'آب':['water','river'],'شهر':['city','urban'],'جاده':['road','highway'],'خودرو':['car','vehicle'],
'غزه':['gaza','palestine'],'فلسطین':['palestine','gaza'],'لبنان':['lebanon','beirut'],'اسرائیل':['israel','jerusalem'],'اسراييل':['israel'],'ایران':['iran','tehran'],
'انتخابات':['election','vote'],'انتخاباتی':['election','vote'],'پارلمانی':['parliament','knesset'],'پارلمان':['parliament','knesset'],'کنست':['knesset','parliament'],
'جنگ':['war','military'],'درگیری':['conflict','military'],'نیروهای':['soldiers','military'],'امنیتی':['security','police'],'بحران':['crisis'],
'نخست':['leader','politics'],'وزیر':['minister','politics'],'دولت':['government','politics'],'اعتراض':['protest','demonstration'],'تظاهرات':['protest','demonstration']};
function norm(s){return String(s||'').toLowerCase().normalize('NFKC').replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').replace(/[\u200c_\-]+/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function terms(s){return [...new Set(norm(s).split(/\s+/).filter(w=>w.length>=3&&!EDIT_STOP.has(w)).flatMap(w=>[w,...(SYNONYMS[w]||[])]))]}
function linesFromScript(script){return script.split(/[\n.!؟؛]+/).map(x=>x.trim()).filter(Boolean).slice(0,15)}
function rankLocal(line){const ts=terms(line);return [...media.values()].filter(m=>m.type==='video'||m.type==='image').map(m=>{
 const name=norm([m.file?.webkitRelativePath||m.name,m.rfTitle,...(m.rfTopics||[])].join(' '));let score=0;for(const t of ts){if(name.split(' ').includes(t))score+=5;else if(name.includes(t))score+=2;}return {m,score};
 }).sort((a,b)=>b.score-a.score||a.m.name.localeCompare(b.m.name))}
// Search intent from Persian narration: short topical English terms, not entire sentences.
// This is NOT a full translation/semantic search service; metadata matches are archival only.
const TOPIC_RULES=[
 {re:/غزه|gaza/i,terms:['Gaza']},
 {re:/لبنان|lebanon|بیروت|beirut/i,terms:['Lebanon']},
 {re:/اسرائیل|اسراييل|israel|اورشلیم|قدس|jerusalem/i,terms:['Israel']},
 {re:/ایران|iran/i,terms:['Iran']},
 {re:/انتخابات|انتخاباتی|election|رأی گیری|رای گیری/i,terms:['election']},
 {re:/کنست|knesset|پارلمان|پارلمانی|parliament/i,terms:['Knesset']},
 {re:/جنگ|نبرد|درگیری|عملیات نظامی|war|conflict/i,terms:['military']},
 {re:/زلزله|earthquake/i,terms:['earthquake']},
 {re:/سیل|flood/i,terms:['flood']},
 {re:/باران|بارش|rain/i,terms:['rain']},
 {re:/آتش.?سوزی|fire/i,terms:['fire']},
 {re:/تهران|tehran/i,terms:['Tehran']},
 {re:/ترافیک|traffic/i,terms:['traffic']},
 {re:/فوتبال|football/i,terms:['football']},
 {re:/اقتصاد|economy/i,terms:['economy']},
 {re:/اعتراض|تظاهرات|protest/i,terms:['protest']},
 {re:/پزشکی|بیمارستان|medical/i,terms:['hospital']},
 {re:/فناوری|تکنولوژی|technology/i,terms:['technology']}
];
const QUERY_STOP=new Set('در از به با برای که این آن یک و یا می شود شده است بود هستند روی خود ما شما فیلم ویدئو خبر گزارش سه سال برابر روز قرار دارد راش آینده سیاسی تاریخ درباره می تواند قرارند گرفته است'.split(' '));
function topicQueries(line,context=''){
  const current=TOPIC_RULES.flatMap(r=>r.re.test(line)?r.terms:[]);
  const global=TOPIC_RULES.flatMap(r=>r.re.test(context)?r.terms:[]);
  const found=current.length?current:global;
  // Distinctive entities precede overly generic words such as 'war'.
  const rank=x=>['Gaza','Knesset','Tehran'].includes(x)?0:
                 ['Lebanon','Israel','Iran'].includes(x)?1:
                 ['election','earthquake','flood','rain','fire','traffic','protest'].includes(x)?2:3;
  const sorted=[...new Set(found)].sort((a,b)=>rank(a)-rank(b));
  if(sorted.length)return sorted;
  const ts=terms(line).filter(t=>!QUERY_STOP.has(t));
  const en=ts.filter(t=>/^[a-z]{3,}$/.test(t)).slice(0,2);
  if(en.length)return en;
  return ts.filter(t=>/[\u0600-\u06ff]/.test(t)).slice(0,2);
}
function searchQueries(lines){
  const override=$('onlineQuery').value.trim();
  if(override)return [override.slice(0,60)];
  const context=lines.join(' '),seen=new Set(),list=[];
  // Let each sentence contribute a topic before taking secondary topics.
  for(const line of lines){const q=topicQueries(line,context)[0];if(q&&!seen.has(q.toLowerCase())){list.push(q);seen.add(q.toLowerCase());}}
  for(const line of lines){for(const q of topicQueries(line,context).slice(1,3))if(!seen.has(q.toLowerCase())){list.push(q);seen.add(q.toLowerCase());}}
  return list.slice(0,8).filter(Boolean);
}
function searchPhrase(line){return topicQueries(line, $('script').value).slice(0,2).join(' ') || 'news';}
// Export read-only query diagnostic for offline test only.
window.rfSmartSearchPreview=(text)=>searchQueries(linesFromScript(text));
const onlineSeen=new Set();
const shotAnalysisCache=new Map();let sceneScanBudget=4;

const remoteImported=new Set();const sourceCredits=[];const autoStages=['search','download','timeline','done'];
function stage(n){const i=autoStages.indexOf(n);document.querySelectorAll('.journey-item').forEach((el,j)=>{el.classList.toggle('done',j<i);el.classList.toggle('active',j===i)});$('autoProgress').style.width=String(Math.max(0,(i+1)*25))+'%'}
function resetStages(){document.querySelectorAll('.journey-item').forEach(el=>el.classList.remove('active','done'));$('autoProgress').style.width='0%'}
function updateCredits(){const el=$('autoCredits');el.hidden=sourceCredits.length===0;el.textContent=sourceCredits.length?'راش‌های آرشیوی استفاده‌شده (مجوز و انتساب را پیش از انتشار بررسی کن):\n'+sourceCredits.map(x=>`${x.source}: ${x.query} | ${x.license} | ${x.page}`).join('\n'):'';$('downloadCredits').classList.toggle('hidden',!sourceCredits.length)}

async function importOnlineHit(hit,q){
 if(remoteImported.has((hit.source||'stock')+':'+hit.id))return [...media.values()].find(m=>m.name.includes((hit.source||'Stock')+'-'+hit.id))||null;
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),35000);
 try{
  let resp;try{resp=await fetch(hit.download,{mode:'cors',credentials:'omit',signal:ctrl.signal});if(!resp.ok)throw Error('HTTP '+resp.status)}catch(first){if(hit.source!=='Wikimedia')throw first;const u=hit.originalUrl||hit.download;if(!/^https:\/\/upload\.wikimedia\.org\//.test(u))throw first;resp=await fetch('/api/smart-download?url='+encodeURIComponent(u),{signal:ctrl.signal});if(!resp.ok)throw Error('دریافت راش مجاز از مسیر جایگزین ممکن نشد (HTTP '+resp.status+')')}
  const size=Number(resp.headers.get('content-length')||0);if(size>50e6)throw Error('این فایل آنلاین بیش از ۵۰ مگابایت است');
  const chunks=[];let total=0;const reader=resp.body?.getReader();if(!reader)throw Error('دریافت قطعه‌ای پشتیبانی نمی‌شود');
  while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>50e6){await reader.cancel();throw Error('حجم فایل آنلاین از حد مجاز بیشتر است')}chunks.push(value)}
  const ext=/webm/i.test(hit.mime||hit.download||'')?'webm':'mp4';const file=new File(chunks,`${hit.source||'Stock'}-${hit.id}-${norm(q).slice(0,45).replace(/\s+/g,'-')}.${ext}`,{type:ext==='webm'?'video/webm':'video/mp4'});
  const m=await importFile(file);if(!m)throw Error('مرورگر نتوانست این فایل ویدئویی را بخواند');m.rfTopics=[q];m.rfTitle=hit.title||q;m.rfProvider=hit.source;m.rfLicense=hit.license||'';m.rfSourcePage=hit.page||'';remoteImported.add((hit.source||'stock')+':'+hit.id);sourceCredits.push({source:hit.source||'Stock',query:q,page:hit.page||'',license:hit.license||'از صفحه منبع بررسی شود'});updateCredits();return m;
 }finally{clearTimeout(timer)}
}
// 0926: choose frames with detail and some visual change within already licensed media.
// This is a technical/visual heuristic, NOT semantic recognition of events in a video.
function seekFrame(video,time,timeoutMs=1300){return new Promise(resolve=>{
 let done=false,timer;const finish=ok=>{if(done)return;done=true;clearTimeout(timer);video.removeEventListener('seeked',okEvent);video.removeEventListener('error',errEvent);resolve(ok)};
 const okEvent=()=>finish(true),errEvent=()=>finish(false);timer=setTimeout(()=>finish(false),timeoutMs);
 video.addEventListener('seeked',okEvent,{once:true});video.addEventListener('error',errEvent,{once:true});
 try{video.currentTime=Math.min(Math.max(0,time),Math.max(.05,(video.duration||time+1)-.1));}catch(_){finish(false)}
})}
function frameSignature(canvasCtx,video){
 try{canvasCtx.drawImage(video,0,0,48,27);const d=canvasCtx.getImageData(0,0,48,27).data;let lum=0,sq=0,black=0;const pixels=new Uint8Array(1296);
 for(let i=0;i<1296;i++){const p=i*4,v=(d[p]*3+d[p+1]*6+d[p+2])/10;pixels[i]=v;lum+=v;sq+=v*v;if(v<12)black++}
 const mean=lum/1296,variation=Math.sqrt(Math.max(0,sq/1296-mean*mean));return {pixels,mean,variation,dark:black/1296};}catch(_){return null}
}
async function visualWindows(m,segment){
 const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.src=m.url;v.style.display='none';
 const cv=document.createElement('canvas');cv.width=48;cv.height=27;const c=cv.getContext('2d',{willReadFrequently:true});
 try{if(!v.readyState)await new Promise((resolve,reject)=>{let timer=setTimeout(()=>reject(Error('metadata timeout')),3000);v.addEventListener('loadedmetadata',()=>{clearTimeout(timer);resolve()},{once:true});v.addEventListener('error',()=>{clearTimeout(timer);reject(Error('decode'))},{once:true});v.load()});
 const max=Math.max(0,m.duration-segment-.16);if(max<.5)return [0];
 const places=[.08,.3,.53,.75].map(x=>max*x);const scored=[];
 for(const at of places){if(!await seekFrame(v,at+Math.min(.4,segment*.2)))continue;
 const a=frameSignature(c,v);if(!a)continue;
 if(!await seekFrame(v,Math.min(m.duration-.1,at+Math.min(1.1,segment*.7))))continue;
 const b=frameSignature(c,v);if(!b)continue;
 let diff=0;for(let i=0;i<a.pixels.length;i+=5)diff+=Math.abs(a.pixels[i]-b.pixels[i]);diff/=Math.ceil(a.pixels.length/5);
 // Sharpness proxy = luma variation; exclude dark transitions. Slight motion preference.
 const score=a.variation*.3+b.variation*.3+Math.min(30,diff)*1.4-(a.dark+b.dark)*35;
 scored.push({at,score});}
 return scored.sort((a,b)=>b.score-a.score).map(x=>x.at);
 }finally{v.pause();v.removeAttribute('src');v.load()}
}
async function pickShotStart(m,segment,usage){
 const maximum=Math.max(0,m.duration-segment-.08);if(maximum<.3||m.type!=='video')return 0;
 const key=m.id+':'+Math.round(segment);let positions=shotAnalysisCache.get(key);
 if(!positions&&sceneScanBudget>0){sceneScanBudget--;
  try{positions=await Promise.race([visualWindows(m,segment),new Promise((_,reject)=>setTimeout(()=>reject(Error('scene timeout')),8000))]);}catch(_){positions=[]}
  shotAnalysisCache.set(key,positions);
 }
 if(positions?.length)return Math.min(maximum,positions[usage%positions.length]);
 return Math.min(maximum,(maximum*(.12+(usage*0.27)%0.75)));
}
function showOnline(hit,query){const root=$('onlineHits');const hitKey=(hit.source||'stock')+':'+hit.id;if(onlineSeen.has(hitKey))return;onlineSeen.add(hitKey);const div=document.createElement('div');div.className='online-hit';div.innerHTML=`<img loading="lazy" alt="پیش‌نمایش راش آرشیوی" src="${escapeText(hit.poster||'')}"><div class="hintline">راش آرشیوی: ${escapeText(query)} · ${fmt(hit.duration||0)} · ${escapeText(hit.creator||hit.source||'Stock')} · مجوز: ${escapeText(hit.license||'مجوز در صفحه منبع بررسی شود')}</div><div class="row"><button class="btn" type="button">دریافت و افزودن</button><a target="_blank" rel="noopener noreferrer" href="${escapeText(hit.page)}">منبع و مجوز</a></div><div class="hintline online-detail"></div>`;
 root.appendChild(div);const button=div.querySelector('button'),info=div.querySelector('.online-detail');button.onclick=async()=>{button.disabled=true;info.textContent='در حال دریافت مستقیم ویدئو روی کامپیوتر…';try{
 const m=await importOnlineHit(hit,query);info.textContent=m?'راش به کتابخانه اضافه شد.':'این ویدئو قبلاً وارد شده است.';status('راش آنلاین به کتابخانه افزوده شد')
 }catch(err){info.textContent='دریافت مستقیم ممکن نشد؛ لینک راش را باز کن، نسخه مجاز را دانلود کن و از تب «رسانه‌ها» وارد کن. '+String(err.message||err);}
 button.disabled=false};return div;}
async function queryLicensed(scriptLines){
 $('onlineHits').innerHTML='';onlineSeen.clear();
 const reports=[],queries=searchQueries(scriptLines),selected=$('licensedSource').value;
 const providers=selected==='auto'?['commons','pexels','pixabay']:[selected];
 let imported=0,results=0,providerUnavailable=new Set();
 if(!queries.length)return 'در متن، موضوع قابل جست‌وجو پیدا نشد. عبارت کوتاه انگلیسی یا نام محل/رویداد بنویس.';
 reports.push('موضوع‌های جست‌وجو: '+queries.join('، '));
 // Limit rate and number of searches; don't start many downloads simultaneously.
 for(const q of queries.slice(0,8)){
  let added=0;
  for(const provider of providers){
   if(providerUnavailable.has(provider)||added>=1||imported>=10)break;
   try{
    $('smartReport').textContent=`⌕ جست‌وجوی «${q}» در ${provider} · ${imported} راش وارد شده…`;
    const resp=await fetch('/api/smart-stock?provider='+encodeURIComponent(provider)+'&q='+encodeURIComponent(q),{headers:{Accept:'application/json'}});
    const data=await resp.json().catch(()=>({}));
    if(!resp.ok){if(resp.status===503){providerUnavailable.add(provider);continue}throw Error(data.error||'HTTP '+resp.status)}
    const hits=(data.videos||[]).slice(0,6);for(const h of hits)showOnline(h,q);
    if(!hits.length)continue;results+=hits.length;stage('download');
    for(const hit of hits.slice(0,4)){
     if(imported>=10||added>=1)break;
     if(remoteImported.has((hit.source||'stock')+':'+hit.id))continue;
     try{const m=await importOnlineHit(hit,q);if(m){added++;imported++;reports.push('✓ «'+q+'»: '+m.name+' دریافت و به کتابخانه افزوده شد');}}
     catch(e){reports.push('«'+q+'»: '+String(e.message||e).slice(0,90))}
    }
   }catch(e){reports.push('«'+q+'» / '+provider+': '+String(e.message||e).slice(0,85))}
  }
  if(!added)reports.push('«'+q+'»: فیلم قابل‌استفاده از منابع فعال دریافت نشد');
  if(imported>=10)break;
 }
 if(!imported)reports.push('هیچ فایل واقعی دریافت نشد؛ در نتیجه ویدئوی ساختگی یا نامرتبط جایگزین نمی‌شود.');
 if(providerUnavailable.size)reports.push('بعضی منابع کلید API ندارند و خودکار کنار گذاشته شدند: '+[...providerUnavailable].join(', '));
 return reports.join('\n');
}
// Search and preview are separate from downloading YouTube/Aparat videos.
// No public YTUltra automation API has been confirmed; don't mislead users.
function searchResearch(site){
 const raw=$('onlineQuery').value.trim()||linesFromScript($('script').value).slice(0,1).join(' ');
 if(!raw){alert('اول متن خبر یا عبارت جست‌وجو را بنویس.');return}
 const q=raw.slice(0,110);
 const url=site==='youtube'?'https://www.youtube.com/results?search_query='+encodeURIComponent(q):'https://www.aparat.com/result/'+encodeURIComponent(q);
 window.open(url,'_blank','noopener,noreferrer');
 $('smartReport').textContent='صفحه جست‌وجو باز شد. برای اضافه‌کردن فیلم، نسخه‌ای را که اجازه استفاده داری از مسیر مجاز دریافت کن و در تب «رسانه‌ها» وارد کن. دانلود خودکار YouTube/آپارات از این نسخه پشتیبانی نمی‌شود.';
}
$('findYoutube').onclick=()=>searchResearch('youtube');
$('findAparat').onclick=()=>searchResearch('aparat');
$('addDirectVideo').onclick=async()=>{
 const field=$('directVideoStatus'),button=$('addDirectVideo'),raw=$('directVideoUrl').value.trim();
 if(!$('directRights').checked){field.textContent='برای واردکردن لینک مستقیم، باید حق استفاده از فایل را تأیید کنی.';return}
 let url;try{url=new URL(raw);if(url.protocol!=='https:'||! /\.(mp4|webm|mov)(?:\?|$)/i.test(url.pathname+url.search)||/(youtube\.com|youtu\.be|aparat\.com|ytultra\.com)$/i.test(url.hostname))throw Error('لینک مستقیم و معتبر MP4 یا WebM وارد کن، نه صفحه دانلود یا پخش.');}catch(e){field.textContent='لینک معتبر نیست: '+e.message;return}
 button.disabled=true;field.textContent='در حال دریافت فایل مستقیم به حافظه مرورگر…';
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),30000);
 try{
  const resp=await fetch(url.href,{mode:'cors',signal:abort.signal,credentials:'omit'});
  if(!resp.ok)throw Error('HTTP '+resp.status);
  const mime=resp.headers.get('content-type')||'';
  if(!/video\//i.test(mime)&&!/octet-stream/i.test(mime))throw Error('آدرس یک ویدئوی مستقیم برنگرداند.');
  const len=Number(resp.headers.get('content-length')||0);if(len>80e6)throw Error('حجم فایل از سقف آزمایشی ۸۰ مگابایت بیشتر است.');
  const reader=resp.body?.getReader();if(!reader)throw Error('بارگذاری جریانی مرورگر پشتیبانی نمی‌شود.');
  let total=0;const chunks=[];while(true){const r=await reader.read();if(r.done)break;total+=r.value.byteLength;if(total>80e6){await reader.cancel();throw Error('فایل بزرگ‌تر از ۸۰ مگابایت است.')}chunks.push(r.value)}
  const filename=(decodeURIComponent(url.pathname.split('/').pop()||'licensed-video.mp4')).slice(0,80).replace(/[^\p{L}\p{N}. _-]/gu,'-');
  const file=new File(chunks,filename,{type:mime.includes('webm')?'video/webm':'video/mp4'});
  const m=await importFile(file);if(!m)throw Error('مرورگر نتوانست رسانه را بخواند');
  field.textContent='ویدئو وارد کتابخانه شد. اکنون تدوین خودکار را اجرا کن.';
 }catch(e){field.textContent='واردکردن فایل ممکن نشد: '+String(e.message||e)+' (سرور ممکن است CORS را مجاز نکرده باشد).'}
 finally{button.disabled=false;clearTimeout(timeout)}
};
$('folderFiles').onchange=async e=>{const files=[...e.target.files].filter(f=>/\.(mp4|mov|mkv|webm|m4v|avi|png|jpe?g|webp)$/i.test(f.name)).slice(0,80);let ok=0;const st=$('folderStatus');st.textContent=`در حال خواندن ${files.length} فایل تصویری…`;
 for(let i=0;i<files.length;i+=5){const batch=await Promise.all(files.slice(i,i+5).map(f=>importFile(f)));ok+=batch.filter(Boolean).length;st.textContent=`${ok} راش و تصویر شناخته شد`;}
 e.target.value='';status(`${ok} فایل از پوشه انتخاب‌شده وارد کتابخانه شد`)};
$('openRushFolder').onclick=()=>$('folderFiles').click();
$('tryLicensed').onclick=()=>{$('useOnline').checked=true;$('quickEdit').click()};
const offlineDemo=location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname);
if(offlineDemo&&new URLSearchParams(location.search).get('demo')==='1'){$('demoEdit').classList.remove('hidden')}
$('demoEdit').onclick=async()=>{
 const report=$('smartReport');report.textContent='در حال بارگذاری راش‌های ساختگی مخصوص تست تایم‌لاین…';
 const samples=['demo/tehran-traffic-rain.mp4','demo/rescue-emergency.mp4'];
 let loaded=0;
 for(const filePath of samples){try{const response=await fetch(filePath);if(!response.ok)throw Error('HTTP '+response.status);const b=await response.blob();const filename=filePath.split('/').pop();if(await importFile(new File([b],filename,{type:'video/mp4'})))loaded++}catch(err){report.textContent='راش نمونه در این بسته موجود نیست: '+err.message;return}}
 if(!$('script').value.trim())$('script').value='بارش باران در تهران باعث ترافیک شد. نیروهای امداد برای کمک اعزام شدند.';
 $('allowGeneric').checked=true;$('useOnline').checked=false;
 report.textContent=loaded+' راش نمونه (غیرخبری و ساختگی) وارد شد. فقط برای تست تدوین و ترنزیشن؛ ربط تصاویر به متن خبر تأیید نشده است.';
 $('quickEdit').click();
};
$('useOnline').checked=true;
// 0928: Do not invoke licensed-stock providers from the automatic editor.
// Only the YouTube reference/cut storyboard may be used by the primary auto-edit button.
$('quickEdit').onclick=async()=>{
 const start=window.rfYTStartAutoEdit;
 if(typeof start!=='function'){
  $('smartReport').textContent='بخش YouTube بارگذاری نشده است. صفحه را تازه‌سازی کن؛ جست‌وجوی ویکی‌مدیا جایگزین نمی‌شود.';
  return;
 }
 return start();
};
// Before generating YouTube cuts, remove old source-specific timeline clips ONLY
// after the user explicitly confirms; narration/music tracks remain untouched.
window.rfPrepareYoutubeOnly=()=>{
 if(exporting){$('smartReport').textContent='ابتدا خروجی در حال اجرا را تمام کن.';return false;}
 if(clips.length||titles.length){
  if(!confirm('برای شروع تدوین فقط با YouTube، کات‌های ویدئویی و متن‌های پروژه فعلی از تایم‌لاین پاک می‌شوند. نریشن و موسیقی باقی می‌مانند. ادامه؟'))return false;
  snapshot();stopPlayback();clips=[];titles=[];selected=null;playheadTime=0;
  afterChange('تایم‌لاین از کلیپ‌های قبلی پاک شد؛ آماده برش‌های YouTube');
 }
 $('onlineHits').replaceChildren();
 sourceCredits.length=0;updateCredits();
 $('smartReport').textContent='منبع خودکار فقط YouTube است. کات‌ها به‌صورت پیش‌نمایش مجازی روی نوار ویدئو قرار می‌گیرند؛ دانلود و MP4 از YouTube انجام نمی‌شود.';
 return true;
};
$('downloadCredits').onclick=()=>{const list=sourceCredits.map((x,i)=>`${i+1}. ${x.source} | ${x.query} | ${x.license} | ${x.page}`).join('\n');saveFile(new Blob([list],{type:'text/plain;charset=utf-8'}),'RushFinder-Stock-Credits.txt')};

// Original, procedurally synthesized ambient loop; no existing song is reproduced.
function originalMusicFile(seconds){
 const rate=16000,n=Math.ceil(rate*seconds),buffer=new ArrayBuffer(44+n*2),v=new DataView(buffer);
 const str=(i,s)=>{for(let j=0;j<s.length;j++)v.setUint8(i+j,s.charCodeAt(j))};
 str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
 const chords=[[196,246.94,293.66],[174.61,220,261.63],[220,261.63,329.63],[164.81,220,261.63]];
 for(let i=0;i<n;i++){const t=i/rate,chord=chords[Math.floor(t/4)%4];let signal=0;for(let k=0;k<3;k++)signal+=Math.sin(2*Math.PI*chord[k]*t)*.035;const pulse=Math.exp(-((t*2)%1)*8)*Math.sin(2*Math.PI*110*t)*.025;const fade=Math.min(1,t/1,Math.max(0,(seconds-t)/1.5));v.setInt16(44+i*2,Math.round(clamp((signal+pulse)*fade,-1,1)*32767),true)}
 return new File([buffer],'RushFinder-Original-Ambient.wav',{type:'audio/wav'});
}
$('autoMusic').onclick=async()=>{status('در حال ساخت موسیقی ساده داخل مرورگر…');await importFile(originalMusicFile(clamp(Math.ceil(duration()||20)+2,8,180)),'music')};
$('recordVoice').onclick=async()=>{if(micRecorder?.state==='recording'){micRecorder.stop();$('recordVoice').textContent='● ضبط نریشن با میکروفون';return}if(!navigator.mediaDevices?.getUserMedia)return alert('این مرورگر اجازه دسترسی به میکروفون را در حالت فعلی نمی‌دهد. می‌توانی فایل نریشن را انتخاب کنی.');try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});const parts=[];micRecorder=new MediaRecorder(micStream);micRecorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};micRecorder.onstop=async()=>{micStream.getTracks().forEach(t=>t.stop());const blob=new Blob(parts,{type:micRecorder.mimeType||'audio/webm'});const f=new File([blob],'Narration-'+Date.now()+'.webm',{type:blob.type});await importFile(f,'voice')};micRecorder.start();$('recordVoice').textContent='■ پایان ضبط نریشن';status('نریشن در حال ضبط است...')}catch(e){alert('ضبط میکروفون ممکن نشد: '+e.message)}};
function saveFile(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('savePlan').onclick=()=>{const p={project:'RushFinder SmartEdit',version:1,aspect:$('aspect').value,transition,stockCredits:sourceCredits,assets:[...media.values()].map(m=>({id:m.id,name:m.name,type:m.type,duration:m.duration})),clips:clips.map(({id,mediaId,in:from,out,speed,volume})=>({id,mediaId,in:from,out,speed,volume})),titles,audio:Object.fromEntries(Object.entries(audioTracks).map(([k,v])=>[k,v?{mediaId:v.mediaId,volume:v.volume,offset:v.offset}:null]))};saveFile(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),'RushFinder-SmartEdit-Project.json');status('طرح پروژه JSON دانلود شد (فایل‌های اصلی همراه آن ذخیره نمی‌شوند)')};
$('newProject').onclick=()=>{if(!confirm('پروژه فعلی پاک شود؟ فایل‌های روی کامپیوتر حذف نمی‌شوند.'))return;stopPlayback();clips=[];titles=[];media.forEach(m=>URL.revokeObjectURL(m.url));media.clear();remoteImported.clear();onlineSeen.clear();window.rfYTReset?.();shotAnalysisCache.clear();sceneScanBudget=4;sourceCredits.length=0;updateCredits();resetStages();$('onlineHits').innerHTML='';audioTracks={music:null,voice:null};selected=null;history=[];playheadTime=0;renderAssets();afterChange('پروژه تازه آماده شد')};
function showModal(){ $('exportModal').classList.add('show');$('downloadExport').classList.add('hidden');$('closeModal').classList.add('hidden');$('cancelExport').classList.remove('hidden');$('exportProgress').value=0;}
function hideModal(){ $('exportModal').classList.remove('show') }
$('closeModal').onclick=hideModal;
$('cancelExport').onclick=()=>{if(exporting){cancelRecording=true;stopPlayback();if(recorder?.state!=='inactive')recorder.stop();exporting=false;status('خروجی لغو شد')}hideModal()};
$('downloadExport').onclick=()=>{if(outputBlob)saveFile(outputBlob,outputName)};
function mimeType(){const test=['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];return test.find(t=>MediaRecorder.isTypeSupported(t))||''}
$('exportBtn').onclick=async()=>{if(exporting)return;if(!clips.length)return alert('اول چند ویدئو یا تصویر در تایم‌لاین قرار بده.');if(!canvas.captureStream||!window.MediaRecorder)return alert('مرورگرت از خروجی مستقیم پشتیبانی نمی‌کند؛ Chrome جدید را امتحان کن.');if(!confirm('خروجی با زمان واقعی ساخته می‌شود. مثلاً ویدئوی یک‌دقیقه‌ای حدود یک دقیقه زمان می‌برد. شروع کنیم؟'))return;
 outputBlob=null;exporting=true;cancelRecording=false;recordedChunks=[];showModal();$('modalTitle').textContent='در حال ساخت خروجی ویدئو';$('modalText').textContent='در حال راه‌اندازی خروجی آفلاین...';const mime=mimeType();if(!mime){exporting=false;hideModal();alert('مرورگر قادر به ضبط خروجی نیست.');return}
 try{stopPlayback();seek(0);ensureAudio();await audioCtx?.resume?.();paint(0);const videoStream=canvas.captureStream(30),tracks=[...videoStream.getVideoTracks()];if(audioDest&&(audioTracks.music||audioTracks.voice||clips.some(c=>c.el?.tagName==='VIDEO')))tracks.push(...audioDest.stream.getAudioTracks());const stream=new MediaStream(tracks);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});recorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data)};recorder.onerror=e=>{status('خطای ضبط خروجی: '+(e.error?.message||'ناشناخته'))};recorder.onstop=()=>{videoStream.getTracks().forEach(t=>t.stop());if(cancelRecording){recordedChunks=[];return}outputBlob=new Blob(recordedChunks,{type:recorder.mimeType});outputName='RushFinder-SmartEdit-'+Date.now()+(recorder.mimeType.includes('mp4')?'.mp4':'.webm');$('modalTitle').textContent='ویدئوی تدوین‌شده آماده است';$('modalText').textContent=`${fa((outputBlob.size/1e6).toFixed(1))} مگابایت · ${recorder.mimeType.includes('mp4')?'MP4':'WebM'} · بدون ارسال به سرور`;$('exportProgress').value=100;$('cancelExport').classList.add('hidden');$('downloadExport').classList.remove('hidden');$('closeModal').classList.remove('hidden');exporting=false;status('خروجی آماده دانلود است')};
 recorder.start(600);await startPlayback();if(!isPlaying)throw Error('پخش پروژه شروع نشد');status('در حال ضبط خروجی روی کامپیوتر...');
 }catch(e){console.error(e);exporting=false;stopPlayback();hideModal();alert('ساخت خروجی ممکن نشد: '+e.message)}};
window.addEventListener('keydown',e=>{const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return}if(editing)return;if(e.code==='Space'){e.preventDefault();isPlaying?stopPlayback():startPlayback()}if(e.key.toLowerCase()==='s'){e.preventDefault();split()}if(e.key==='Delete'||e.key==='Backspace')removeSelected()});
window.addEventListener('beforeunload',()=>{for(const m of media.values())URL.revokeObjectURL(m.url);pauseAll()});
renderAssets();renderTimeline();renderInspector();paint(0);
// Canvas text is rasterized; repaint it once the remotely hosted Vazir font loads.
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('400 18px RushVazir0923', 'پیش‌نمایش پروژه'),
    document.fonts.load('700 30px RushVazir0923', 'راش‌ها را وارد کن و تدوین را شروع کن')
  ]).then(() => paint(playheadTime)).catch(() => {});
  document.fonts.addEventListener?.('loadingdone', () => paint(playheadTime));
}
status('آماده · برای تدوین از متن، تب ✦ تدوین از متن را انتخاب کن');
})();
