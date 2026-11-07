(()=>{'use strict';
// SmartEdit 0932 narration-aligned chapter-based YouTube cut-preview storyboard: official YouTube IFrame, NO content download or MP4 capture.
const $=id=>document.getElementById(id), out=(el,s)=>{if(el)el.textContent=s};
const btn=$('rfYTSearch'), status=$('rfYTStatus'), results=$('rfYTResults'), track=$('rfYTTrack');
const overlay=$('rfYTOverlay'), host=$('rfYTPlayerHost'), inspector=$('rfYTCutInspector');
const S={items:[],gaps:[],selected:-1,player:null,apiReady:false,videoId:'',loadedClip:-1,voiceFile:null,voiceURL:null,voice:null,duration:0,active:false,timer:null,playToken:0,clipId:1,startPerf:0,lastTime:0,nativeControls:false,proposals:[],playerReady:false,pendingLoad:null};
function rfYtEnabled(){return window.rfTrackState?.youtube!==false}

const fmt=n=>{n=Math.max(0,Number(n)||0);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`};
const safe=s=>String(s||'').slice(0,180), clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
function message(s,err=false){out(status,s);status.style.color=err?'#a53a44':'#426580'}
// Normalize legacy /api errors that may be strings, objects, or Google error envelopes.
function rfYTApiError(data,httpStatus){
 const raw=data?.error??data?.message??data?.detail??null;
 let note='';
 if(typeof raw==='string')note=raw;
 else if(raw&&typeof raw==='object'){
  note=String(raw.message||raw.error?.message||raw.errors?.[0]?.message||raw.errors?.[0]?.reason||raw.status||raw.code||'');
 }
 const code=String(data?.code||raw?.status||raw?.errors?.[0]?.reason||'');
 const extra=String(data?.hint||'');
 const all=(note+' '+code).toLowerCase();
 if(/quotaexceeded|dailylimitexceeded|quota exceeded/.test(all))note='سهمیه روزانه YouTube Data API تمام شده. سهمیه پروژه Google Cloud را بررسی کن.';
 else if(/keyinvalid|api key not valid|invalid api key|api_key_invalid/.test(all))note='کلید YouTube مخصوص تدوین معتبر نیست. مقدار YOUTUBE_SMARTEDIT_API_KEY در Vercel را بررسی کن.';
 else if(/accessnotconfigured|service_disabled|api has not been used|api.*disabled|api_key_service_blocked/.test(all))note='YouTube Data API v3 برای پروژه این کلید فعال نیست یا محدودیت کلید مانع دسترسی شده است.';
 else if(/referer|ip.*block|requests from.*blocked|permission_denied|forbidden/.test(all))note='کلید YouTube اجازه این درخواست سروری را ندارد. Application restrictions و API restrictions را بررسی کن.';
 else if(httpStatus===429)note=note||'محدودیت تعداد جست‌وجوها فعال شده؛ کمی بعد دوباره امتحان کن.';
 else if(httpStatus===503)note=note||'تنظیم کلید سروری یا سرویس YouTube آماده نیست.';
 if(!note)note='پاسخ نامعتبر از سرور تدوین دریافت شد.';
 note=(note+' '+extra).trim().replace(/AIza[0-9A-Za-z_-]{20,}/g,'[کلید مخفی]').slice(0,360);
 return 'HTTP '+httpStatus+' · '+note;
}
async function rfYTLookup(query){
 let resp;
 try{resp=await fetch('/api/youtube-music?mode=smartedit&q='+encodeURIComponent(query),{headers:{Accept:'application/json'}})}
 catch(_){throw new Error('اتصال مرورگر به API تدوین برقرار نشد. اتصال اینترنت و وضعیت Vercel را بررسی کن.')}
 let data;
 try{data=await resp.json()}
 catch(_){throw new Error('پاسخ سرور JSON نیست (HTTP '+resp.status+'). وضعیت Deployment و مسیر api/youtube-music.js را بررسی کن.')}
 if(!resp.ok)throw new Error(rfYTApiError(data,resp.status));
 if(!data||!Array.isArray(data.items))throw new Error('پاسخ API ناقص است؛ آرایه items دریافت نشد. فایل api/youtube-music.js را هم با نسخه اصلاحیه جایگزین کن.');
 return data.items;
}
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
// Intent-rich backup queries: never fall back to random generic search results.
const topics=[
 [/نابرابر|شکاف طبقاتی|اختلاف طبقاتی|توزیع ثروت/i,['income inequality','wealth gap']],
 [/طبقه متوسط|اقشار متوسط/i,['middle class','household income']],
 [/تورم|گرانی|افزایش قیمت/i,['inflation','rising prices']],
 [/فقر|فقیر|محروم/i,['poverty','low income']],
 [/اقتصاد|اقتصادی|رکود/i,['economy','economic crisis']],
 [/مالیات|مالیاتی/i,['tax policy','taxation']],
 [/بانک|بانکی/i,['bank','financial sector']],
 [/نفت|نفتی|قیمت نفت/i,['oil','petroleum']],
 [/بودجه|کسری بودجه/i,['budget','fiscal policy']],
 [/بورس|سهام|بازار سرمایه/i,['stock market','stock exchange']],
 [/دلار|ارز|پول ملی/i,['currency','exchange rate']],
 [/غزه|غزّه/i,['Gaza','Gaza Strip']],
 [/لبنان|حزب الله/i,['Lebanon','Hezbollah']],
 [/ایران|تهران/i,['Iran','Tehran']],
 [/اسرائیل|صهیونیست/i,['Israel','Israeli']],
 [/کنست|پارلمان/i,['Knesset','parliament']],
 [/انتخابات|رأی گیری|رای گیری/i,['election','voting']],
 [/حمله|جنگ|درگیری|بمباران/i,['attack','war']],
 [/نتانیاهو/i,['Netanyahu']],
 [/زلزله/i,['earthquake']],
 [/سیل|بارش باران/i,['flood','rainfall']],
 [/فوتبال/i,['football','soccer']],
 [/مدرسه|آموزش/i,['school','education']],
 [/بیمارستان|درمان/i,['hospital','medical']],
 [/هواپیما/i,['aircraft','airplane']],
 [/مذاکرات|گفتگوهای صلح/i,['negotiations','talks']],
 [/آمریکا|امریکا|ایالات متحده/i,['United States','USA']],
 [/ترامپ/i,['Trump']]
];
const genericWords=new Set(['news','footage','video','the','with','from','this','that','about','and','for','official','report','latest','live','update','breaking','of','in','on','at','a','to']);
function norm(t){return String(t||'').toLowerCase().normalize('NFKC').replace(/[\u064b-\u065f]/g,'').replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim()}
function anchorTerms(s){const terms=topics.filter(([re])=>re.test(s)).flatMap(([,keys])=>keys.slice(0,1));return [...new Set(terms)].slice(0,6)}
function searchQuery(s){const anchors=anchorTerms(s);if(anchors.length>=2)return anchors.slice(0,5).join(' ')+' news report';if(anchors.length===1)return anchors[0]+' '+s.split(/\s+/).filter(x=>x.length>=4).slice(0,3).join(' ').slice(0,75);return s.replace(/[،؛:«»؟.!\n]/g,' ').split(/\s+/).filter(x=>x.length>=3).slice(0,9).join(' ').slice(0,90)}
function sentences(raw){
 const rawParts=raw.replace(/\r/g,'').split(/(?<=[.!؟؛])\s+|\n+/).map(v=>v.trim()).filter(Boolean),a=[];
 for(const part of rawParts){let words=part.split(/\s+/).filter(Boolean);while(words.length)a.push(words.splice(0,42).join(' '))}
 // Cover the WHOLE narration. Merge adjacent short sentences instead of dropping everything after 20 sentences.
 while(a.length>12){let at=0,best=Infinity;for(let i=0;i<a.length-1;i++){const score=(a[i]+' '+a[i+1]).split(/\s+/).length;if(score<best){best=score;at=i}}a.splice(at,2,a[at]+' '+a[at+1])}
 return a;
}
function beats(lines,seconds){const ws=lines.map(s=>Math.max(5,s.split(/\s+/).length));let sum=ws.reduce((a,b)=>a+b,0),st=0;return ws.map((w,i)=>{let duration=i===lines.length-1?seconds-st:seconds*w/sum;const r={start:st,duration};st+=duration;return r})}
function relevance(v,query,anchors=[]){
 const str=norm([v.title,v.description,v.channel].join(' '));
 if(/\b(parody|mocking|satire|comedy|prank|reaction|gameplay|music video|cartoon|animation|ai generated|ai video|fake news|tutorial|lesson|math exam|gaming)\b/i.test(str))return -100;
 const words=norm(query).split(' ').filter(t=>t.length>3&&!genericWords.has(t));
 const terms=[...new Set([...anchors,...words].map(norm).filter(Boolean))];
 let points=0,hits=0;
 for(const term of terms){if(str.includes(term)){hits++;points+=term.includes(' ')?6:3}}
 // Distinctive anchors are much more important than broad shared words.
 for(const a of anchors){if(str.includes(norm(a)))points+=6}
 return points;
}
function sortedOptions(items,q,anchors=[]){return items.filter(x=>/^[\w-]{11}$/.test(x.id||'')).map(v=>({...v,rank:relevance(v,q,anchors)})).filter(x=>x.rank>-80).sort((a,b)=>b.rank-a.rank).slice(0,12)}
async function requestAI(task,segments,candidates=[]){
 try{const r=await fetch('/api/youtube-music?mode=smartedit-analyze',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({task,segments:segments.map((text,index)=>({index,text})),candidates})});
  if(!r.ok)return null;const j=await r.json();return j?.ai?j:null;
 }catch(_){return null}
}
// Only author-supplied chapter timestamps give us a defensible source interval.
// Matching the chapter TITLE to the narration query does NOT mean the video frames were analyzed.
function matchingChapter(video,query,anchors,minLength){
 const chapters=Array.isArray(video.chapters)?video.chapters:[];
 const ignore=new Set(['news','report','reports','latest','video','footage','live','official','breaking','the','and','for','with','about','from','this','that','iran','usa','united','states','us','of','in','on','at','new']);
 const desired=[...new Set(norm([...(anchors||[]),query].join(' ')).split(' ').filter(w=>w.length>2&&!ignore.has(w)))];
 if(!desired.length)return null;
 let winner=null;
 for(const chapter of chapters){
  const start=Number(chapter?.start),end=Number(chapter?.end),title=norm(chapter?.title);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end-start<minLength+0.15||!title)continue;
  const words=new Set(title.split(' '));
  const matched=desired.filter(word=>words.has(word));
  const exact=(anchors||[]).some(a=>norm(a).length>6&&title.includes(norm(a)));
  // Two distinctive topic terms, or a multi-word exact named entity.
  if(matched.length<2&&!exact)continue;
  const score=matched.length*3+(exact?7:0);
  if(!winner||score>winner.score)winner={start,end,title:chapter.title,score};
 }
 return winner;
}
function strictFallback(options,query,anchors){
 // No AI or AI failed: titles MUST match a distinctive topical anchor; do not fill with unrelated videos.
 const precise=anchors.map(norm).filter(x=>x.length>4&&!genericWords.has(x));
 if(!precise.length)return [];
 return options.filter(v=>v.rank>=9&&precise.some(a=>norm([v.title,v.description].join(' ')).includes(a))).slice(0,3);
}
async function probeVoice(file){if(!file)return 0;return new Promise(resolve=>{const au=document.createElement('audio'),url=URL.createObjectURL(file);let done=false;const finish=n=>{if(done)return;done=true;clearTimeout(timer);URL.revokeObjectURL(url);resolve(Number.isFinite(n)?n:0)};const timer=setTimeout(()=>finish(0),7000);au.onloadedmetadata=()=>finish(au.duration);au.onerror=()=>finish(0);au.src=url;au.load()})}
function attachVoice(file){if(!file){S.voiceFile=null;if(S.voice){S.voice.pause();S.voice.removeAttribute('src');S.voice.load()}if(S.voiceURL)URL.revokeObjectURL(S.voiceURL);S.voiceURL=null;return}S.voiceFile=file;if(S.voiceURL)URL.revokeObjectURL(S.voiceURL);S.voiceURL=URL.createObjectURL(file);if(!S.voice){S.voice=new Audio();S.voice.preload='auto';S.voice.addEventListener('ended',stop)}S.voice.src=S.voiceURL;S.voice.volume=1}
$('autoVoiceInput')?.addEventListener('change',e=>attachVoice(e.target.files?.[0]),true);
$('guideVoice')?.addEventListener('change',e=>attachVoice(e.target.files?.[0]),true);
function selectedItem(){return S.items[S.selected]}
function setSelection(i,activate=true){if(i<0||!S.items[i])return;S.selected=i;renderTrack();renderInspector();updateClock(S.items[i].start);if(activate){stop();showClip(i,false,0)}}
function renderTrack(){
 track.replaceChildren();track.classList.toggle('rf-layer-off',!rfYtEnabled());const px=Number($('zoom')?.value||44),realClips=!!window.rfSmartEditHasClips?.();
 const videoTrack=$('videoTrack');videoTrack?.querySelectorAll('.rf-yt-shadow').forEach(el=>el.remove());
 $('timeline').style.minWidth=Math.max(880,Math.ceil(36+Math.max(S.duration,durationTotal())*px+90))+'px';
 S.gaps.forEach(g=>{const b=document.createElement('div');b.className='rf-yt-gap';b.style.left=(36+g.start*px)+'px';b.style.width=Math.max(34,g.duration*px-2)+'px';b.textContent='⚠ راش مرتبط پیدا نشد · '+safe(g.sentence).slice(0,55);b.title='این بخش خالی است تا فیلم نامرتبط روی نریشن قرار نگیرد: '+g.sentence;track.appendChild(b)});
 if(!S.items.length){track.innerHTML='<div class="drop-hint">برش‌های پیشنهادی YouTube اینجا نمایش داده می‌شوند</div>';return}
 S.items.forEach((item,i)=>{
  const v=item.options[item.optionIndex||0];const label='✂ '+safe(item.sentence).slice(0,32)+' ← '+safe(v?.title||'نامشخص').slice(0,35);
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
 add('✓ اعمال برش',()=>{stop(false);const old=it.duration;const maxSeconds=it.options[it.optionIndex||0]?.durationSeconds||21600;it.duration=clamp(Number(length.value),0.5,60);it.sourceStart=clamp(Number(source.value),0,Math.max(0,maxSeconds-it.duration));it.sourceEnd=it.sourceStart+it.duration;shiftFollowing(it, it.duration-old);renderReferences();setSelection(Math.max(0,S.items.indexOf(it)));message('بازه شروع و پایان این برش تغییر کرد. پخش‌کننده فقط این قسمت را پیش‌نمایش می‌دهد.')});
 add('✂ تقسیم وسط برش',()=>splitAt(it.start+it.duration/2));
 add('🗑 حذف برش',()=>{stop(false);const j=S.items.indexOf(it);S.items.splice(j,1);shiftAll();S.selected=Math.min(j,S.items.length-1);renderReferences();if(S.selected>=0)showClip(S.selected,false,0);else{overlay.hidden=true;message('برش حذف شد.')}});
 inspector.appendChild(line);
}
function shiftFollowing(it,delta){const pos=S.items.indexOf(it);for(let i=pos+1;i<S.items.length;i++)S.items[i].start+=delta;S.duration=Math.max(S.duration,durationTotal());updateClock(0)}
function shiftAll(){let at=0;for(const it of S.items){it.start=at;at+=it.duration}S.duration=at;updateClock(0)}
function renderReferences(){results.replaceChildren();S.items.forEach((item,i)=>{const row=document.createElement('div');row.className='rf-yt-result'+(item.unverified?' rf-yt-unverified':'');const v=item.options[item.optionIndex||0];const thumb=document.createElement('img');thumb.alt='تصویر بندانگشتی منبع';if(/^https:\/\//.test(v?.thumbnail||''))thumb.src=v.thumbnail;row.appendChild(thumb);
 const side=document.createElement('div');const head=document.createElement('b');head.textContent='برش '+(i+1)+' · '+fmt(item.start)+'–'+fmt(item.start+item.duration);side.appendChild(head);
 const selector=document.createElement('select');selector.setAttribute('aria-label','انتخاب منبع برش '+(i+1));for(const [j,opt] of item.options.entries()){const o=document.createElement('option');o.value=j;o.textContent=safe(opt.title);selector.appendChild(o)}selector.value=item.optionIndex||0;selector.onchange=()=>{stop(false);item.optionIndex=+selector.value;const selectedDuration=item.options[item.optionIndex]?.durationSeconds||21600;item.sourceStart=Math.min(item.sourceStart,Math.max(0,selectedDuration-item.duration));item.sourceEnd=item.sourceStart+item.duration;renderReferences();setSelection(i)};side.appendChild(selector);
 const script=document.createElement('div');script.className='rf-yt-script';script.textContent='🎙 '+safe(item.sentence);side.appendChild(script);
 const warn=document.createElement('small');warn.textContent='فصل زمان‌دار: '+(item.chapterTitle||'نامعلوم')+' · ارتباط فقط از عنوان/توضیح فصل سنجیده شده؛ تصویر تحلیل نشده و قبل از انتشار باید دیده شود.';side.appendChild(warn);
 const link=document.createElement('a');link.href='https://www.youtube.com/watch?v='+v.id+'&t='+Math.floor(item.sourceStart)+'s';link.target='_blank';link.rel='noopener noreferrer';link.textContent='منبع در YouTube';side.appendChild(link);row.appendChild(side);row.onclick=e=>{if(e.target===selector||e.target===link)return;setSelection(i)};results.appendChild(row)});if(S.proposals.length)showUnlocatedSuggestions(S.proposals);renderTrack();renderInspector()}
function showUnlocatedSuggestions(groups){
 const d=document.createElement('div');d.className='rf-yt-unlocated';
 const h=document.createElement('b');h.textContent='ویدئوهای پیشنهادی بدون زمان کاتِ قابل تأیید';d.appendChild(h);
 const p=document.createElement('p');p.textContent='عنوان و توضیح مرتبط است، اما زمان صحنه در اطلاعات یوتیوب وجود ندارد. برای این موارد کات خودکار حدسی ساخته نشده؛ می‌توانی ویدئو را در YouTube بررسی کنی.';d.appendChild(p);
 for(const g of groups.slice(0,8)){
  const a=document.createElement('a');a.href='https://www.youtube.com/watch?v='+g.video.id;a.target='_blank';a.rel='noopener noreferrer';a.textContent='↗ '+safe(g.video.title)+' · بخش '+(g.index+1);d.appendChild(a);
 }
 results.appendChild(d);
}
$('zoom')?.addEventListener('input',renderTrack);window.addEventListener('rfTimelineChanged',renderTrack);
function ensurePlayer(){if(window.YT?.Player)return Promise.resolve();if(!document.querySelector('script[data-rfyt]')){const el=document.createElement('script');el.async=true;el.dataset.rfyt='1';el.src='https://www.youtube.com/iframe_api';document.head.appendChild(el)}return new Promise((resolve,reject)=>{const expire=Date.now()+13000;const timer=setInterval(()=>{if(window.YT?.Player){clearInterval(timer);resolve()}else if(Date.now()>expire){clearInterval(timer);reject(new Error('پخش‌کننده یوتیوب بارگذاری نشد؛ اینترنت یا محدودیت نمایش ویدئو را بررسی کن.'))}},160)})}
// IFrame events, not direct media decoding; no extraction or re-encoding of YouTube frames.
async function showClip(index,playing=false,elapsed=0){const it=S.items[index];if(!it)return;S.selected=index;renderTrack();renderInspector();if(!rfYtEnabled()){overlay.hidden=true;return}overlay.hidden=false;const token=++S.playToken;
 try{await ensurePlayer();if(token!==S.playToken)return;const opt=it.options[it.optionIndex||0];const sec=clamp(it.sourceStart+elapsed,0,86400),end=it.sourceStart+it.duration;
  const args={videoId:opt.id,startSeconds:sec,endSeconds:end};
  S.pendingLoad={args,playing};if(!S.player){host.replaceChildren();const el=document.createElement('div');el.id='rfYTPlayerSlot';host.appendChild(el);S.player=new YT.Player(el.id,{width:'640',height:'360',videoId:opt.id,playerVars:{playsinline:1,controls:S.nativeControls?1:0,rel:0,origin:location.origin},events:{onReady:e=>{S.playerReady=true;e.target.mute();const pending=S.pendingLoad;if(pending){if(pending.playing)e.target.loadVideoById(pending.args);else e.target.cueVideoById(pending.args)}},onStateChange:e=>{if(e.target.isMuted&&!e.target.isMuted())e.target.mute()},onError:()=>{stop();message('این ویدئو قابلیت پخش تعبیه‌شده ندارد؛ منبع دیگری انتخاب کن.',true)},onAutoplayBlocked:()=>{
 stop();
 // Official YouTube controls are restored only if the browser blocks programmatic autoplay.
 // This provides the required native play button without obscuring or modifying YouTube branding.
 if(!S.nativeControls){
  S.nativeControls=true;
  try{S.player?.destroy?.()}catch(_){}
  S.player=null;S.playerReady=false;S.loadedClip=-1;
  const ix=Math.max(0,S.selected);
  showClip(ix,false,0);
 }
 message('مرورگر پخش خودکار را مسدود کرد؛ کنترل‌های رسمی یوتیوب فعال شدند. ▶ داخل ویدئو را بزن.',true)
}}})}
  else if(S.playerReady){S.player.mute();if(playing)S.player.loadVideoById(args);else S.player.cueVideoById(args)}
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
 if(S.voice)S.voice.muted=window.rfTrackState?.voice===false;
 const t=currentTime(),total=Math.max(S.duration,durationTotal());updateClock(t);
 try{S.player?.mute?.()}catch(_){}
 const ix=S.items.findIndex(x=>t>=x.start&&t<x.start+x.duration);
 if(ix<0){overlay.hidden=true;if(S.loadedClip!==-1){try{S.player?.pauseVideo?.()}catch(_){}S.loadedClip=-1}}
 if(ix>=0&&rfYtEnabled()&&(ix!==S.selected||S.loadedClip===-1))showClip(ix,true,t-S.items[ix].start);
 if(ix>=0&&rfYtEnabled()&&ix===S.selected&&S.player?.getCurrentTime){const cur=S.player.getCurrentTime();const target=S.items[ix].sourceStart+(t-S.items[ix].start);
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
 if(S.voiceFile&&S.voice){try{S.voice.muted=window.rfTrackState?.voice===false;S.voice.currentTime=at;S.voice.play().catch(e=>{message('پخش نریشن مسدود شد: '+e.message,true);stop()})}catch(e){message(e.message,true)}}
 if(rfYtEnabled())showClip(ix,true,at-S.items[ix].start);else overlay.hidden=true;
 S.timer=setInterval(playbackTick,160);
}
$('rfYTPlay').addEventListener('click',()=>S.active?stop():start(0));$('rfYTPause').addEventListener('click',()=>stop());
// The main preview controls manage virtual YouTube edits when there is no locally downloadable video.
$('play').addEventListener('click',e=>{if(!S.items.length||window.rfSmartEditHasClips?.())return;e.stopImmediatePropagation();if(S.active)stop();else start(S.lastTime)},true);
for(const [id,delta] of [['back',-5],['forward',5]])$(id).addEventListener('click',e=>{if(!S.items.length||window.rfSmartEditHasClips?.())return;e.stopImmediatePropagation();seekVirtual(S.lastTime+delta)},true);
$('scrubRail').addEventListener('click',e=>{if(!S.items.length||window.rfSmartEditHasClips?.())return;e.stopImmediatePropagation();const r=e.currentTarget.getBoundingClientRect();seekVirtual((e.clientX-r.left)/r.width*Math.max(S.duration,durationTotal()))},true);

function reset(){stop();++S.playToken;S.items=[];S.gaps=[];S.proposals=[];S.selected=-1;S.duration=0;S.loadedClip=-1;try{S.player?.stopVideo?.()}catch(_){}overlay.hidden=true;renderReferences();updateClock(0);message('برش‌های مجازی پاک شدند؛ فایل‌های شخصی تغییر نکردند.')}
$('rfYTClear').addEventListener('click',reset);// Clear references explicitly; the original new-project confirmation remains untouched.
function splitAt(at){const i=S.items.findIndex(it=>at>it.start+0.4&&at<it.start+it.duration-0.4);if(i<0)return message('برای تقسیم، نشانگر را داخل برش بگذار یا دکمه تقسیم وسط برش را بزن.',true);stop();const a=S.items[i],len=at-a.start;const b={...a,id:S.clipId++,start:at,duration:a.duration-len,sourceStart:a.sourceStart+len,sourceEnd:a.sourceStart+a.duration};a.duration=len;a.sourceEnd=a.sourceStart+len;S.items.splice(i+1,0,b);renderReferences();setSelection(i+1);message('برش مجازی در '+fmt(at)+' تقسیم شد؛ صدای ویدئوها خاموش است.')}
$('rfYTSplit')?.addEventListener('click',()=>{const t=S.voice?.currentTime||0;const i=S.selected;const v=S.items[i];const at=S.active?t:v?v.start+v.duration/2:-1;splitAt(at)});
$('rfYTPlan').onclick=()=>{if(!S.items.length)return message('هنوز برشی ساخته نشده.',true);const data={type:'RushFinder YouTube Virtual Cut Storyboard — not MP4',version:'0932',renderableMP4:false,voiceSeconds:S.duration,unmatched:S.gaps,clips:S.items.map(it=>({sentence:it.sentence,query:it.query,timelineStart:it.start,timelineDuration:it.duration,sourceStart:it.sourceStart,sourceEnd:it.sourceEnd,chapterTitle:it.chapterTitle,source:it.options[it.optionIndex||0],verifiedByHuman:false}))};const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='RushFinder-0932-YouTube-Chapter-Storyboard.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)};
// Embedded YouTube clips cannot be included in MediaRecorder MP4/WebM output.
for(const b of [$('exportBtn'),$('rfExportSide')])b?.addEventListener('click',e=>{if(S.items.length&&!confirm('برش‌های یوتیوب فقط مجازی هستند و داخل خروجی MP4 یا WebM نمی‌آیند. ادامه می‌دهی؟')){e.preventDefault();e.stopImmediatePropagation()}},true);
btn.onclick=async()=>{
 const text=$('script').value.trim();if(!text)return message('متن واقعی نریشن را در کادر متن وارد کن. فایل صوتی به‌تنهایی برای فهم موضوع کافی نیست.',true);
 const parts=sentences(text);if(!parts.length)return message('متن کافی نیست.',true);
 $('rfYTPanel').open=true;
 btn.disabled=true;stop();message('در حال تحلیل موضوع '+parts.length+' بخش از کل نریشن؛ کات‌های قبلی تا پیدا شدن نتیجه مرتبط حفظ می‌شوند…');
 try{
  let dur=S.voiceFile?await probeVoice(S.voiceFile):0;if(!dur)dur=parts.reduce((n,p)=>n+p.split(/\s+/).length,0)/2.3;
  dur=clamp(dur,5,1200);
  const steps=beats(parts,dur),suggested=[],gaps=[],cache=new Map(),candidateGroups=[],errors=[];S.proposals=[];
  const plan=await requestAI('plan',parts);const plans=new Map((plan?.segments||[]).map(x=>[x.index,x]));
  const segmentInputs=parts.map((text,index)=>({index,text}));
  let requests=0;
  for(let i=0;i<parts.length;i++){
   const ai=plans.get(i),query=(ai&&ai.query?ai.query:searchQuery(parts[i])).trim().slice(0,110),anchors=(Array.isArray(ai?.anchors)&&ai.anchors.length?ai.anchors:anchorTerms(parts[i])).slice(0,5);
   if(!query){candidateGroups.push({index:i,query,anchors,options:[]});continue}
   message('جست‌وجوی متن '+(i+1)+'/'+parts.length+' : '+query);
   let options=cache.get(query);
   if(!options){requests++;let found;
    try{found=await rfYTLookup(query)}catch(e){throw new Error('جست‌وجوی بخش '+(i+1)+' ناموفق بود: '+e.message)}
    options=sortedOptions(found,query,anchors);cache.set(query,options);
   }
   candidateGroups.push({index:i,query,anchors,options});
  }
  // A second semantic check matches the ACTUAL sentence against ACTUAL YouTube metadata.
  message('بررسی ارتباط عنوان و توضیحات ویدئوها با جملات واقعی نریشن…');
  const judge=await requestAI('judge',parts,candidateGroups.map(g=>({index:g.index,options:g.options.slice(0,9)})));
  const judged=new Map((judge?.matches||[]).map(x=>[x.index,x]));
  for(let i=0;i<parts.length;i++){
   const beat=steps[i],g=candidateGroups[i];let options=[];
   if(judge){const verdict=judged.get(i);const valid=new Set((verdict?.ids||[]).slice(0,4));options=g.options.filter(v=>valid.has(v.id)).slice(0,4)}
   else options=strictFallback(g.options,g.query,g.anchors);
   options=options.filter(v=>!v.durationSeconds||v.durationSeconds>2.5);
   if(!options.length){gaps.push({start:beat.start,duration:beat.duration,sentence:parts[i],query:g.query,reason:'هیچ ویدئوی دارای ارتباط قابل تأیید با متن پیدا نشد'});errors.push('بخش '+(i+1));continue}
   // No guessed offsets. Select ONLY intervals documented as timestamped chapters
   // and matching this segment's topic; otherwise keep the section unresolved.
   const count=Math.min(42,Math.max(1,Math.ceil(beat.duration/6.5)));
   const piece=beat.duration/count;
   const eligible=options.map(video=>({video,chapter:matchingChapter(video,g.query,g.anchors,piece)})).filter(x=>x.chapter);
   if(!eligible.length){
    gaps.push({start:beat.start,duration:beat.duration,sentence:parts[i],query:g.query,reason:'هیچ فصل زمان‌دار مرتبطی در توضیحات ویدئوها پیدا نشد'});
    S.proposals.push(...options.slice(0,2).map(video=>({index:i,video})));
    continue;
   }
   const position=new Map();let unmatchedStart=null;
   for(let c=0;c<count;c++){
    const ordered=[...eligible].sort((a,b)=>b.chapter.score-a.chapter.score);
    let picked=null;
    for(const candidate of ordered){
     const key=candidate.video.id+'@'+candidate.chapter.start;
     const used=position.get(key)||0;
     if(candidate.chapter.end-candidate.chapter.start-used>=piece+.15){picked={...candidate,offset:used,key};break}
    }
    if(!picked){unmatchedStart=beat.start+c*piece;break}
    position.set(picked.key,picked.offset+piece);
    const sourceStart=picked.chapter.start+picked.offset;
    suggested.push({id:S.clipId++,sentence:parts[i],query:g.query,start:beat.start+c*piece,duration:piece,sourceStart,sourceEnd:sourceStart+piece,options:[picked.video],optionIndex:0,unverified:true,chapterTitle:picked.chapter.title});
   }
   if(unmatchedStart!==null)gaps.push({start:unmatchedStart,duration:Math.max(0,beat.start+beat.duration-unmatchedStart),sentence:parts[i],query:g.query,reason:'بازه زمان‌دارِ مرتبط برای ادامه این جمله کافی نبود'});
  }
  if(!suggested.length){
   renderReferences();message(S.proposals.length?'ویدئوهای مرتبط از نظر عنوان پیدا شدند، اما زمان فصل‌بندی‌شدهٔ مناسب برای کات نبود. زمان حدسی نمی‌سازیم؛ لینک‌ها در فهرست هستند و کات‌های قبلی حفظ شدند.':'ویدئوی واقعاً مرتبط و دارای زمان کات مناسب پیدا نشد. کات حدسی نمی‌سازیم و کات‌های قبلی حفظ شدند.',true);
   return;
  }
  if(window.rfPrepareYoutubeOnly?.()===false){message('جایگزینی لغو شد؛ کات‌های قبلی حفظ شدند.');return}
  const unmatchedProposals=S.proposals.slice();reset();S.proposals=unmatchedProposals;S.items=suggested;S.gaps=gaps;S.duration=dur;S.selected=0;renderReferences();updateClock(0);
  await showClip(0,false,0);
  message('✓ '+suggested.length+' برشِ مجازی بر اساس فصل‌های زمان‌دار YouTube ساخته شد؛ '+gaps.length+' بازه بدون زمان قابل تأیید خالی ماند. عنوان فصل‌ها با متن تطبیق داده شده اما محتوای تصویری فریم‌ها بررسی نشده است. برش‌های یوتیوب وارد MP4 نمی‌شوند.',false);
 }catch(e){message('تدوین ناتمام ماند؛ کات‌های قبلی حفظ شدند. '+(e?.message||String(e)),true)}finally{btn.disabled=false}
};

window.rfYTSetVisibility=enabled=>{
 ++S.playToken;
 if(!enabled){overlay.hidden=true;S.loadedClip=-1;try{S.player?.pauseVideo?.()}catch(_){}return}
 if(!S.items.length)return;
 const at=S.active?currentTime():S.lastTime;
 const ix=S.items.findIndex(it=>at>=it.start&&at<it.start+it.duration);
 if(ix>=0)showClip(ix,S.active,at-S.items[ix].start);
};
window.rfYTStartAutoEdit=()=>btn.onclick();
window.rfYTReset=reset;
window.rfYTStopPreview=()=>{stop();overlay.hidden=true};
window.rfYTPreviewState=()=>({count:S.items.length,duration:S.duration,active:S.active,sourceCount:new Set(S.items.map(it=>it.options[it.optionIndex||0]?.id)).size});
renderInspector();message('فقط YouTube: برای جلوگیری از کات‌های تصادفی، برش خودکار فقط از فصل‌های زمان‌دار مرتبط ساخته می‌شود. تصویر فیلم‌ها تحلیل نمی‌شود.');
window.addEventListener('beforeunload',()=>{stop();if(S.voiceURL)URL.revokeObjectURL(S.voiceURL)});
})();
