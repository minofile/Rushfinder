(()=>{'use strict';
// YouTube REFERENCE storyboard. No video streams are downloaded, captured, or exported.
// Official IFrame embedded player is kept visible and independently controlled.
const id=s=>document.getElementById(s), text=(e,s)=>{e.textContent=s};
const queryBtn=id('rfYTSearch'),status=id('rfYTStatus'),results=id('rfYTResults'),ytTrack=id('rfYTTrack');
const overlay=id('rfYTOverlay'),playerHost=id('rfYTPlayerHost');
const state={items:[],selected:0,player:null,apiReady:false,voiceFile:null,voiceObject:null,voiceAudio:null,voiceDuration:0,clock:0,startedAt:0,active:false,currentVideoId:null,timer:0};
const format=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const safeValue=s=>String(s||'').slice(0,450);
function setStatus(s,error=false){text(status,s);status.style.color=error?'#a63745':''}
const topics=[[/غزه|غزّه/i,'Gaza'],[/لبنان|حزب الله/i,'Lebanon'],[/ایران|تهران/i,'Iran'],[/اسرائیل|صهیونیست/i,'Israel'],[/کنست|پارلمان/i,'Knesset'],[/انتخابات|رای گیری/i,'election'],[/جنگ|حمله|درگیری/i,'conflict'],[/نتانیاهو/i,'Netanyahu'],[/زلزله/i,'earthquake'],[/باران|سیل/i,'flood'],[/فوتبال/i,'football'],[/مدرسه|آموزش/i,'education'],[/اقتصاد|تورم/i,'economy'],[/بیمارستان|درمان/i,'hospital'],[/هواپیما/i,'aircraft'],[/مذاکرات/i,'talks']];
function searchQuery(s){const found=topics.filter(([reg])=>reg.test(s)).map(([,v])=>v);return found.length?[...new Set(found)].slice(0,5).join(' ')+' news footage':s.replace(/[،؛:«»؟.!\n]/g,' ').split(/\s+/).filter(w=>w.length>=3).slice(0,8).join(' ').slice(0,100)}
function getSentences(raw){let segments=raw.replace(/\r/g,'').split(/(?<=[.!؟؛])\s+|\n+/).map(x=>x.trim()).filter(Boolean);if(segments.length<2&&raw.length>190){const ws=raw.split(/\s+/).filter(Boolean);segments=[];while(ws.length)segments.push(ws.splice(0,Math.max(12,Math.ceil(ws.length/Math.min(4,Math.ceil(ws.length/18))))).join(' '));}return segments.slice(0,5)}
function chooseDurations(sentences,dur){const weights=sentences.map(s=>Math.max(8,s.length));const sum=weights.reduce((a,b)=>a+b,0);const scale=dur/sum;let at=0;return weights.map((w,i)=>{const start=at;const length=i===weights.length-1?Math.max(.5,dur-at):w*scale;at+=length;return {start,duration:length}})}
function voiceDuration(file){return new Promise(resolve=>{if(!file)return resolve(0);const audio=document.createElement('audio'),url=URL.createObjectURL(file);audio.preload='metadata';const finish=n=>{URL.revokeObjectURL(url);resolve(n)};const timeout=setTimeout(()=>finish(0),8500);audio.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);finish(Number.isFinite(audio.duration)?audio.duration:0)},{once:true});audio.addEventListener('error',()=>{clearTimeout(timeout);finish(0)},{once:true});audio.src=url;audio.load();});}
function readyVoice(file){if(!file)return;state.voiceFile=file;if(state.voiceObject)URL.revokeObjectURL(state.voiceObject);state.voiceObject=URL.createObjectURL(file);if(!state.voiceAudio){state.voiceAudio=new Audio();state.voiceAudio.preload='metadata';}state.voiceAudio.src=state.voiceObject;state.voiceAudio.volume=1;state.voiceAudio.addEventListener('ended',pause,{once:true});}
// Capture selected voice even when the main editor resets the file input afterward.
id('autoVoiceInput').addEventListener('change',e=>readyVoice(e.target.files?.[0]),true);
id('guideVoice')?.addEventListener('change',e=>readyVoice(e.target.files?.[0]),true);
function renderReferences(){results.replaceChildren();ytTrack.replaceChildren();if(!state.items.length){ytTrack.innerHTML='<div class="drop-hint">پیشنهادهای YouTube (بدون دریافت فایل)</div>';return;}
const timeline=id('timeline');let needed=36+state.items.reduce((s,c)=>s+c.duration,0)*44+60;timeline.style.minWidth=Math.max(880,needed)+'px';
state.items.forEach((item,i)=>{
 const row=document.createElement('div');row.className='rf-yt-result';const img=document.createElement('img');img.alt='تصویر بندانگشتی یوتیوب';if(item.options[0]?.thumbnail?.startsWith('https://'))img.src=item.options[0].thumbnail;row.appendChild(img);
 const side=document.createElement('label');text(side,'جمله '+(i+1)+' · '+format(item.start)+' تا '+format(item.start+item.duration));const sel=document.createElement('select');sel.setAttribute('aria-label','انتخاب ویدئوی جمله '+(i+1));
 item.options.forEach((opt,index)=>{const choice=document.createElement('option');choice.value=String(index);text(choice,safeValue(opt.title));sel.appendChild(choice)});sel.value=String(item.optionIndex||0);sel.addEventListener('change',()=>{item.optionIndex=Number(sel.value);drawLane();link.href='https://www.youtube.com/watch?v='+item.options[item.optionIndex||0].id;if(state.selected===i)selectClip(i)});side.appendChild(sel);const cap=document.createElement('small');text(cap,item.query+' · نتایج پیشنهادی؛ ارتباط ویدئو با خبر باید بررسی شود');side.appendChild(cap);const link=document.createElement('a');link.target='_blank';link.rel='noopener noreferrer';link.href='https://www.youtube.com/watch?v='+item.options[item.optionIndex||0].id;link.textContent='بازکردن صفحه ویدئو در YouTube';side.appendChild(link);row.appendChild(side);results.appendChild(row);
 });drawLane();}
function drawLane(){ytTrack.replaceChildren();let zoom=Number(id('zoom')?.value||44);state.items.forEach((item,i)=>{const video=item.options[item.optionIndex||0];const clip=document.createElement('button');clip.type='button';clip.className='rf-yt-clip'+(i===state.selected?' active':'');clip.style.left=(36+item.start*zoom)+'px';clip.style.width=Math.max(55,item.duration*zoom-2)+'px';clip.title=safeValue(video.title)+' — '+item.sentence;clip.textContent='▶ '+safeValue(video.title).slice(0,52);clip.addEventListener('click',()=>selectClip(i));ytTrack.appendChild(clip)});}
id('zoom').addEventListener('input',drawLane);
// YouTube IFrame API player: only official embed playback, muted. No canvas capture.
window.onYouTubeIframeAPIReady=()=>{state.apiReady=true;if(state.items.length)selectClip(state.selected)};
function ensureAPI(){if(window.YT?.Player){state.apiReady=true;return Promise.resolve()}if(!document.querySelector('script[data-rfyt]')){const sc=document.createElement('script');sc.src='https://www.youtube.com/iframe_api';sc.async=true;sc.dataset.rfyt='1';document.head.appendChild(sc)}return new Promise((resolve,reject)=>{const deadline=Date.now()+15000;const watch=setInterval(()=>{if(window.YT?.Player){clearInterval(watch);state.apiReady=true;resolve()}else if(Date.now()>deadline){clearInterval(watch);reject(new Error('بارگذاری پخش‌کننده یوتیوب ممکن نشد؛ اینترنت یا محدودیت دسترسی را بررسی کن.'))}},150)})}
function playFromItem(item,auto){const video=item.options[item.optionIndex||0];if(!video||!state.apiReady)return;
 if(!auto)try{state.player?.pauseVideo?.()}catch(_e){}
 if(!state.player){playerHost.replaceChildren();const slot=document.createElement('div');slot.id='rfYTPlayerSlot';playerHost.appendChild(slot);state.player=new YT.Player(slot,{height:'360',width:'640',videoId:video.id,playerVars:{playsinline:1,controls:1,rel:0,origin:location.origin},events:{onReady:e=>{e.target.mute();if(auto)e.target.playVideo()},onStateChange:e=>{if(e.target.isMuted&& !e.target.isMuted())e.target.mute()}}});state.currentVideoId=video.id;}
 else {if(state.currentVideoId!==video.id){if(auto)state.player.loadVideoById({videoId:video.id,startSeconds:0});else state.player.cueVideoById({videoId:video.id,startSeconds:0});state.currentVideoId=video.id;}state.player.mute();if(auto)state.player.playVideo();}
 overlay.hidden=false;
}
async function selectClip(i,auto=false){if(!state.items[i])return;state.selected=i;drawLane();overlay.hidden=false;try{await ensureAPI();playFromItem(state.items[i],auto);setStatus('پیش‌نمایش YouTube فعال است و صدای ویدئو خاموش می‌ماند؛ برای همگام‌سازی نریشن، دکمه پخش با نریشن را بزن.')}catch(e){setStatus(e.message,true)}}
function pause(){state.active=false;clearInterval(state.timer);if(state.voiceAudio&&!state.voiceAudio.paused)state.voiceAudio.pause();try{state.player?.pauseVideo?.()}catch(_e){}}
async function play(){pause();if(!state.items.length)return setStatus('ابتدا راش‌های پیشنهادی را جست‌وجو کن.',true);if(!state.voiceFile)return setStatus('برای پخش هماهنگ، نریشن را انتخاب کن.',true);await selectClip(0,false);state.active=true;state.clock=performance.now();state.startedAt=0;state.voiceAudio.currentTime=0;try{await state.voiceAudio.play()}catch(e){pause();return setStatus('برای پخش نریشن دوباره روی دکمه بزن: '+e.message,true)};state.timer=setInterval(()=>{if(!state.active)return;const t=state.voiceAudio.currentTime;try{state.player?.mute?.()}catch(_e){};id('time').textContent=format(t)+' / '+format(state.voiceDuration||state.items.at(-1)?.start+state.items.at(-1)?.duration||0);id('playhead').style.left=(36+t*Number(id('zoom').value||44))+'px';const i=state.items.findIndex(c=>t>=c.start&&t<c.start+c.duration);if(i>=0&&i!==state.selected)selectClip(i,true);if(t>=state.items.at(-1).start+state.items.at(-1).duration-.1)pause();},220);try{state.player?.playVideo?.();state.player?.mute?.()}catch(_e){};}
id('rfYTPlay').onclick=play;id('rfYTPause').onclick=pause;
function clear(){pause();state.items=[];state.selected=0;renderReferences();overlay.hidden=true;id('timeline').style.minWidth='';try{state.player?.stopVideo?.()}catch(_){};setStatus('ارجاع‌های یوتیوب پاک شدند؛ فایل شخصی تغییر نکرد.');}
id('rfYTClear').onclick=clear;
id('newProject').addEventListener('click',()=>{if(id('videoTrack')?.querySelector('.drop-hint'))clear()});
function saveJSON(){if(!state.items.length)return setStatus('هنوز فهرست ارجاع‌ها ساخته نشده.',true);const out={type:'RushFinder YouTube Reference Storyboard (NOT renderable MP4)',version:'0924',noDownload:true,silentEmbeds:true,created:new Date().toISOString(),segments:state.items.map(item=>({sentence:item.sentence,query:item.query,start:item.start,duration:item.duration,video:item.options[item.optionIndex||0]}))};const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='RushFinder-YouTube-References-0924.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
id('rfYTPlan').onclick=saveJSON;
// Prevent accidental claim that embedded YouTube frames are rendered as MP4.
for(const b of [id('exportBtn'),id('rfExportSide')])if(b)b.addEventListener('click',e=>{if(!state.items.length)return;if(!window.confirm('توجه: ارجاع‌های YouTube در خروجی ویدئو قرار نمی‌گیرند؛ فقط راش‌های محلی قابل خروجی‌گیری‌اند. ادامه بدهم؟')){e.preventDefault();e.stopImmediatePropagation()}},true);
queryBtn.onclick=async()=>{
 const script=id('script').value.trim();if(!script)return setStatus('متن نریشن را وارد کن.',true);
 const sentences=getSentences(script);if(!sentences.length)return setStatus('متن برای جست‌وجو کافی نیست.',true);
 queryBtn.disabled=true;pause();clear();setStatus('در حال جست‌وجو برای '+sentences.length+' جمله؛ ممکن است چند ثانیه طول بکشد…');
 try{
  let dur=state.voiceFile?await voiceDuration(state.voiceFile):0;if(!dur)dur=sentences.length*6;
  dur=Math.min(Math.max(3,dur),360);const beats=chooseDurations(sentences,dur);let accepted=[],failed=[];
  for(let i=0;i<sentences.length;i++){
    const query=searchQuery(sentences[i]);setStatus('جست‌وجوی جمله '+(i+1)+' از '+sentences.length+' · '+query);
    let data;try{const res=await fetch('/api/youtube-music?mode=smartedit&q='+encodeURIComponent(query),{headers:{Accept:'application/json'}});data=await res.json();if(!res.ok)throw new Error(data.error||'HTTP '+res.status)}catch(e){failed.push('جمله '+(i+1)+': '+e.message);continue;}
    if(!Array.isArray(data.items)||!data.items.length){failed.push('جمله '+(i+1)+': نتیجه قابل نمایش پیدا نشد.');continue}
    accepted.push({sentence:sentences[i],query,start:beats[i].start,duration:beats[i].duration,options:data.items,optionIndex:0});
  }
  state.items=accepted;state.voiceDuration=dur;state.selected=0;renderReferences();if(accepted.length)await selectClip(0,false);
  setStatus(accepted.length+' ارجاع یوتیوب در تایم‌لاین قرار گرفت. '+(failed.length?failed.join(' | '):'')+' · این ویدئوها دانلود نشده‌اند.',!accepted.length);
 }catch(e){setStatus('خطا: '+e.message,true)}finally{queryBtn.disabled=false}
};
setStatus('برای جست‌وجوی واقعی، کلید YOUTUBE_SMARTEDIT_API_KEY را فقط روی سرور تنظیم کن.');
window.addEventListener('beforeunload',()=>{pause();if(state.voiceObject)URL.revokeObjectURL(state.voiceObject)});
})();