(()=>{
const css=`#rfNarrationPage{display:none;direction:rtl;position:relative;margin:24px auto;max-width:1250px;padding:0;background:transparent;color:#183552;font-family:inherit}#rfNarrationPage.active{display:block;animation:nrAppear .32s ease-out}@keyframes nrAppear{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}#rfNarrationPage *{box-sizing:border-box}#rfNarrationPage .nr-hero{position:relative;overflow:hidden;display:flex;justify-content:space-between;align-items:center;gap:22px;padding:28px 35px;border-radius:24px;background:linear-gradient(113deg,#eef6ff 0%,#dcecff 65%,#d1e7ff 100%);border:1px solid #cde1fc;box-shadow:0 10px 26px #1c5fa015;margin-bottom:18px}#rfNarrationPage .nr-hero:before{content:"";position:absolute;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#74b8ff75,transparent 70%);left:20%;top:-150px}#rfNarrationPage .nr-kicker{font-size:12px;font-weight:700;color:#1476da;letter-spacing:.4px;margin-bottom:10px}#rfNarrationPage h2{margin:0 0 10px;font-size:clamp(22px,2.2vw,31px);font-weight:800;color:#0c315e}#rfNarrationPage .nr-hero p{margin:0;line-height:1.9;font-size:14px;color:#476988}#rfNarrationPage .nr-hero-art{display:flex;align-items:center;justify-content:center;min-width:132px;height:120px;position:relative}#rfNarrationPage .nr-mic{font-size:68px;filter:drop-shadow(0 14px 13px #1c5da54a);transform:rotate(-8deg)}#rfNarrationPage .nr-wave{position:absolute;bottom:2px;left:0;display:flex;align-items:center;gap:4px;height:24px}#rfNarrationPage .nr-wave i{display:block;width:4px;border-radius:6px;background:#398cf3;height:12px}#rfNarrationPage .nr-wave i:nth-child(2n){height:23px}#rfNarrationPage .nr-wave i:nth-child(3n){height:16px}#rfNarrationPage .nr-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.85fr);gap:18px;align-items:start}#rfNarrationPage .nr-card{background:#fff;border:1px solid #dfebf8;border-radius:22px;padding:24px;box-shadow:0 8px 28px #244b7410}#rfNarrationPage .nr-card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}#rfNarrationPage .nr-card-heading strong{font-size:17px;color:#193858}#rfNarrationPage .nr-tag{border:1px solid #cce2ff;background:#eff6ff;color:#236fc3;border-radius:999px;padding:6px 11px;font-size:11px;font-weight:700}#rfNarrationPage label{display:flex;flex-direction:column;gap:9px;font-size:13px;font-weight:700;color:#2a4663}#rfNarrationPage textarea{display:block;width:100%;min-height:215px;resize:vertical;padding:19px;border:1px solid #d7e4f3;border-radius:15px;background:#f9fcff;font:inherit;font-size:14px;line-height:2;direction:rtl;color:#1a3550;outline:none;transition:.2s}#rfNarrationPage textarea:focus,#rfNarrationPage select:focus{border-color:#2788f7;box-shadow:0 0 0 3px #2585ff18}#rfNarrationPage .nr-count{display:flex;justify-content:space-between;gap:8px;margin:10px 0 20px;font-size:11px;color:#7a90a7}#rfNarrationPage .nr-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}#rfNarrationPage .nr-voice-field{grid-column:1/-1}#rfNarrationPage select{width:100%;padding:12px 14px;border:1px solid #d6e3f1;border-radius:12px;background:#f8fbff;color:#234462;font:inherit;font-size:13px;outline:none;min-height:46px}#rfNarrationPage .nr-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:22px}#rfNarrationPage button{border:0;border-radius:12px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;transition:transform .15s,filter .15s}#rfNarrationPage button:hover{filter:brightness(1.04);transform:translateY(-1px)}#rfNarrationPage button:disabled{opacity:.6;cursor:wait}#rfNarrationPage #nrGenerate{flex:1;min-width:180px;padding:16px 20px;color:#fff;background:linear-gradient(100deg,#0873f5,#2e93ff);box-shadow:0 8px 20px #0873f542}#rfNarrationPage #nrReload{padding:15px 18px;background:#edf5ff;border:1px solid #d4e6ff;color:#1868c6}#rfNarrationPage .nr-side{display:flex;flex-direction:column;gap:18px}#rfNarrationPage .nr-preview{background:linear-gradient(155deg,#0d3261,#16519a);color:#fff;min-height:215px;border:0;position:relative;overflow:hidden}#rfNarrationPage .nr-preview:after{content:"";position:absolute;width:200px;height:200px;left:-65px;bottom:-110px;border-radius:50%;background:#5da8ff22}#rfNarrationPage .nr-preview h3{font-size:17px;color:white;margin:0 0 12px}#rfNarrationPage .nr-preview p{font-size:12px;color:#d3e6ff;line-height:2;margin:0}#rfNarrationPage .nr-preview-icon{font-size:36px;margin-bottom:14px}#rfNarrationPage .nr-status{margin:16px 0 0;min-height:32px;font-size:12px;color:#bedbff;line-height:1.8}#rfNarrationPage .nr-status:empty:before{content:'آماده برای تولید اولین نریشن';color:#bedbff}#rfNarrationPage audio{display:block;width:100%;margin-top:14px}#rfNarrationPage audio[hidden]{display:none}#rfNarrationPage #nrDownload a{display:inline-flex;margin:14px 0 0;padding:11px 16px;border-radius:10px;background:#e1fff2;color:#06774a;font-weight:700;text-decoration:none;font-size:12px}#rfNarrationPage .nr-tip{background:#fff;border:1px solid #e0ebf7;border-radius:20px;padding:20px;line-height:2;color:#637d98;font-size:12px}#rfNarrationPage .nr-tip strong{display:block;font-size:14px;color:#214466;margin-bottom:8px}#rfNarrationPage .nr-tip p{margin:0}#rfNarrationNav{display:flex;align-items:center;gap:8px}#rfNarrationNav i{font-style:normal}#rfNarrationPage .nr-footnote{margin:18px 3px;color:#8a9cb1;font-size:11px;line-height:1.8}@media(max-width:960px){#rfNarrationPage{margin:14px}#rfNarrationPage .nr-layout{grid-template-columns:1fr}#rfNarrationPage .nr-side{display:grid;grid-template-columns:1fr 1fr}}@media(max-width:620px){#rfNarrationPage{margin:10px}#rfNarrationPage .nr-hero{padding:21px;border-radius:17px}#rfNarrationPage .nr-hero-art{min-width:70px;height:75px}#rfNarrationPage .nr-mic{font-size:43px}#rfNarrationPage .nr-wave{display:none}#rfNarrationPage .nr-card{padding:18px;border-radius:17px}#rfNarrationPage .nr-grid,#rfNarrationPage .nr-side{grid-template-columns:1fr}#rfNarrationPage .nr-actions{flex-direction:column}#rfNarrationPage .nr-actions button{width:100%}}`;
const st=document.createElement('style');st.textContent=css+'\n/* RushFinder V0301 — narration layout polish */\n#rfNarrationPage{padding-top:20px!important;scroll-margin-top:95px}\n#rfNarrationPage .nr-hero{padding:20px 26px!important;min-height:128px!important;margin-bottom:14px!important}\n#rfNarrationPage .nr-hero-art{height:85px!important;min-width:105px!important}\n#rfNarrationPage .nr-mic{font-size:52px!important}\n#rfNarrationPage .nr-preview{min-height:150px!important;padding:18px 20px!important}\n#rfNarrationPage .nr-preview-icon{font-size:23px!important;margin-bottom:6px!important}\n#rfNarrationPage .nr-preview h3{font-size:15px!important;margin-bottom:5px!important}\n#rfNarrationPage .nr-preview p{line-height:1.75!important}\n#rfNarrationPage .nr-side{gap:12px!important}\n#rfNarrationPage .nr-tip{padding:14px 18px!important}\n@media(max-width:620px){#rfNarrationPage{padding-top:14px!important}#rfNarrationPage .nr-hero{padding:16px!important;min-height:0!important}#rfNarrationPage .nr-preview{min-height:125px!important}}\n\n/* RushFinder V0301 - visual refresh */\n#rfNarrationPage .nr-hero{background:linear-gradient(116deg,#edf7ff 0%,#dceeff 54%,#cce5ff 100%);border:1px solid #badbff;box-shadow:0 12px 36px #2371bc22,inset 0 1px 0 #fff;isolation:isolate}\n#rfNarrationPage .nr-hero:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.4;background-image:radial-gradient(#3e8fea 1px,transparent 1px);background-size:23px 23px;mask-image:linear-gradient(to right,#000,transparent 50%);z-index:-1}\n#rfNarrationPage .nr-kicker{display:inline-flex;align-items:center;padding:6px 12px;border-radius:20px;background:#fff9;border:1px solid #c8e1ff;letter-spacing:1px}\n#rfNarrationPage .nr-hero-art{min-width:150px!important;height:116px!important;filter:drop-shadow(0 10px 14px #1269ba3a)}\n#rfNarrationPage .nr-art-halo{position:absolute;width:120px;height:120px;border-radius:50%;background:linear-gradient(140deg,#ffffffd9,#85bdf8b5);box-shadow:inset 0 2px 15px #ffffff,0 8px 24px #3180cb36}\n#rfNarrationPage .nr-art-mic{position:relative;font-size:62px;z-index:1;transform:rotate(-8deg)}\n#rfNarrationPage .nr-wave{z-index:2;bottom:2px;left:-18px;background:#fffdfd;border:1px solid #d1e7ff;padding:6px 10px;border-radius:20px;box-shadow:0 5px 12px #2d7ac029;height:34px}\n#rfNarrationPage .nr-card{box-shadow:0 10px 35px #1c569515;border-color:#d7e7f8}\n#rfNarrationPage .nr-card-heading strong{display:flex;align-items:center;gap:8px}\n#rfNarrationPage .nr-voice-field{position:relative}\n#rfNarrationPage .nr-grid{grid-template-columns:1fr;margin:16px 0 6px}\n#rfNarrationPage .nr-voice-field select{min-height:55px;border:1px solid #bcdcff;background:linear-gradient(180deg,#fff,#f0f7ff);box-shadow:0 3px 12px #1c76c50d}\n#rfNarrationPage textarea{background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #c8def5;min-height:230px}\n#rfNarrationPage #nrGenerate{background:linear-gradient(105deg,#005fd9,#258eff);box-shadow:0 9px 23px #1174ef40;min-height:52px}\n#rfNarrationPage .nr-preview{background:radial-gradient(ellipse at 0% 0%,#3179c7 0%,transparent 62%),linear-gradient(140deg,#0a2b55,#124e94);box-shadow:0 12px 30px #0b4d9c25}\n#rfNarrationPage .nr-preview-icon{display:flex;align-items:center;gap:16px;height:42px;margin-bottom:12px}\n#rfNarrationPage .nr-live-dot{display:inline-block;width:16px;height:16px;border:4px solid #a7dcff;border-radius:50%;box-shadow:0 0 0 6px #ffffff1a,0 0 20px #71d4ff}\n#rfNarrationPage .nr-soundbars{display:flex;gap:4px;height:37px;align-items:center}\n#rfNarrationPage .nr-soundbars i{width:4px;height:14px;border-radius:10px;background:linear-gradient(#d3efff,#53b4ff)}\n#rfNarrationPage .nr-soundbars i:nth-child(3n){height:31px}#rfNarrationPage .nr-soundbars i:nth-child(2n){height:23px}#rfNarrationPage .nr-soundbars i:nth-child(5n){height:9px}\n#rfNarrationPage .nr-tip{background:linear-gradient(145deg,#fff,#f2f8ff);border:1px solid #d8e8fa}\n@media(max-width:620px){#rfNarrationPage .nr-hero-art{min-width:76px!important;height:80px!important}#rfNarrationPage .nr-art-halo{width:74px;height:74px}#rfNarrationPage .nr-art-mic{font-size:40px}#rfNarrationPage .nr-wave{display:none}#rfNarrationPage textarea{min-height:180px}}\n\n/* V0303 - clean compact hero */\n#rfNarrationPage .nr-hero{min-height:136px!important;padding:22px 30px!important;align-items:center!important}\n#rfNarrationPage .nr-hero h2{margin:0 0 10px!important}\n#rfNarrationPage .nr-hero p{margin:0!important;line-height:1.7!important}\n@media(max-width:620px){#rfNarrationPage .nr-hero{min-height:112px!important;padding:17px 19px!important}}\n';document.head.append(st);
function start(){
const nav=document.querySelector('.nav');const main=document.querySelector('main');if(!nav||!main)return;
const b=document.createElement('button');b.type='button';b.id='rfNarrationNav';b.innerHTML='<i>🎙</i><span>نریشن</span>';
const settings=[...nav.querySelectorAll('button')].find(x=>x.textContent.includes('تنظیمات'));nav.insertBefore(b,settings||null);
const page=document.createElement('section');page.id='rfNarrationPage';page.innerHTML=`<div class="nr-hero"><div><h2>🎙 استودیوی نریشن فارسی</h2><p>متن خبر و سناریو را به صدای حرفه‌ای تبدیل کنید.</p></div><div class="nr-hero-art"><div class="nr-art-halo"></div><div class="nr-art-mic">🎙️</div><div class="nr-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div><div class="nr-layout"><div class="nr-card"><div class="nr-card-heading"><strong>✍️ متن نریشن</strong><span class="nr-tag">تبدیل متن به صدا</span></div><label for="nrText">متن نریشن</label><textarea id="nrText" maxlength="3500" placeholder="متن خبر یا سناریوی خود را اینجا وارد کنید..."></textarea><div class="nr-count"><span id="nrCount">۰ / ۳۵۰۰ نویسه</span><span>متن فارسی · حداکثر ۳۵۰۰ نویسه</span></div><div class="nr-grid"><label>🤖 مدل تولید صدا<select id="nrModel"><option value="eleven_v4">Eleven v4 — جدیدترین نسخه</option><option value="eleven_multilingual_v2">Multilingual v2 — نسخه جایگزین</option></select></label><label class="nr-voice-field">🎧 انتخاب صدا<select id="nrVoice"><option value="">برای دریافت صداها روی «بارگذاری صداها» بزنید</option></select></label></div><div class="nr-actions"><button id="nrGenerate" type="button">✦ تولید نریشن</button><button id="nrReload" type="button">↻ بارگذاری صداها</button></div></div><div class="nr-side"><div class="nr-card nr-preview"><div class="nr-preview-icon"><span class="nr-live-dot"></span><span class="nr-soundbars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div><h3>پیش‌نمایش خروجی</h3><p>پس از تولید، فایل صوتی شما در همین قسمت برای پخش و دانلود آماده می‌شود.</p><div class="nr-status" id="nrStatus" role="status"></div><audio id="nrPlayer" controls hidden></audio><div id="nrDownload"></div></div><div class="nr-tip"><strong>💡 راهنمای تولید صدای بهتر</strong><p>برای نتیجه طبیعی‌تر، متن را با نشانه‌گذاری و مکث‌های درست بنویسید. ابتدا با یک متن کوتاه صدا را آزمایش کنید.</p></div></div></div><div class="nr-footnote">🔒 تولید صدا از اعتبار ElevenLabs شما استفاده می‌کند. کلید API در سرور Vercel نگهداری می‌شود.</div>`;
main.prepend(page);
const $=id=>document.getElementById(id);let objectUrl=null,loaded=false;
let narrationPin='';
async function narrationFetch(body){
 if(!narrationPin)throw Error('ابتدا با رمز وارد بخش نریشن شوید.');
 const r=await fetch('/api/narration',{method:'POST',headers:{'Content-Type':'application/json','X-Narration-Pin':narrationPin},body:JSON.stringify(body)});
 if(r.status===401)narrationPin='';
 return r;
}
async function enterNarration(){
 if(narrationPin){show();return;}
 const pin=window.prompt('رمز ورود به بخش نریشن را وارد کنید:');
 if(pin===null||!pin.trim())return;
 try{
  const r=await fetch('/api/narration',{method:'POST',headers:{'Content-Type':'application/json','X-Narration-Pin':pin.trim()},body:JSON.stringify({action:'voices'})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(typeof j.error==='string'?j.error:'اتصال به سرویس نریشن برقرار نشد.');
  narrationPin=pin.trim();show();renderVoices(j.voices||[]);
 }catch(e){window.alert('ورود به نریشن انجام نشد: '+e.message+'\n\nاگر هنوز NARRATION_ACCESS_PIN را در Vercel تنظیم نکرده‌اید، ابتدا آن را تنظیم و سایت را دوباره Deploy کنید.');}
}
// Persian display labels only; voice IDs and synthesis are unchanged.
const NR_PERSIAN_VOICES={
 'roger':'راجر | آرام، خودمانی و گیرا',
 'sarah':'سارا | پخته، مطمئن و دلنشین',
 'laura':'لورا | پرانرژی و سرزنده',
 'charlie':'چارلی | صدای بم، مطمئن و پرانرژی',
 'george':'جورج | گرم و مناسب داستان‌گویی',
 'callum':'کالوم | بم و رازآلود',
 'river':'ریور | آرام، خنثی و مناسب اطلاع‌رسانی',
 'harry':'هری | پرانرژی و حماسی',
 'liam':'لیام | پرانرژی و اجتماعی',
 'alice':'آلیس | واضح و گیرا، مناسب آموزش',
 'matilda':'ماتیلدا | حرفه‌ای و آگاه',
 'will':'ویل | آرام و خوش‌بین',
 'jessica':'جسیکا | بازیگوش، شاد و گرم',
 'eric':'اریک | نرم و قابل‌اعتماد',
 'bella':'بلا | حرفه‌ای، روشن و گرم',
 'chris':'کریس | صمیمی و خودمانی',
 'brian':'برایان | بم، گیرا و آرامش‌بخش',
 'daniel':'دنیل | محکم و مناسب گویندگی',
 'lily':'لیلی | لطیف و نمایشی',
 'adam':'آدام | بم و قاطع'
};
const NR_VOICE_WORDS={
  "laid-back":"آرام و خودمانی","casual":"خودمانی","resonant":"پرطنین",
  "mature":"پخته","reassuring":"آرامش‌بخش","confident":"مطمئن",
  "enthusiast":"مشتاق","enthusiastic":"پرانرژی","quirky":"خاص و متفاوت",
  "attitude":"با شخصیت","deep":"بم","energetic":"پرانرژی",
  "warm":"گرم","captivating":"گیرا","storyteller":"داستان‌گو",
  "husky":"خش‌دار","trickster":"بازیگوش","relaxed":"آرام",
  "neutral":"خنثی","informative":"اطلاع‌رسان","fierce":"قدرتمند",
  "warrior":"حماسی","social media creator":"مناسب محتوای شبکه‌های اجتماعی",
  "clear":"واضح","engaging":"جذاب","educator":"آموزشی",
  "knowledgeable":"آگاه","professional":"حرفه‌ای","optimist":"خوش‌بین",
  "playful":"بازیگوش","bright":"روشن","smooth":"نرم",
  "trustworthy":"قابل‌اعتماد","charming":"دلنشین","down-to-earth":"صمیمی",
  "comforting":"آرامش‌بخش","steady":"باثبات","broadcaster":"گوینده",
  "velvety":"مخملی","actress":"بازیگر","dominant":"مسلط","firm":"قاطع"
};
const NR_NAME_LETTERS={
 a:"ا",b:"ب",c:"ک",d:"د",e:"ِ",f:"ف",g:"گ",h:"ه",i:"ی",j:"ج",k:"ک",
 l:"ل",m:"م",n:"ن",o:"و",p:"پ",q:"ک",r:"ر",s:"س",t:"ت",u:"و",
 v:"و",w:"و",x:"کس",y:"ی",z:"ز"
};
function nrPersianName(name){
 const known=NR_PERSIAN_VOICES[name.toLowerCase()];
 if(known)return known.split(" | ")[0];
 return name.replace(/[A-Za-z]+/g,word=>Array.from(word.toLowerCase()).map(c=>NR_NAME_LETTERS[c]||c).join(""));
}
function persianVoiceLabel(v){
 const original=String(v.name||"").trim();
 const chunks=original.split(/\\s*[-–—|:]\\s*/).filter(Boolean);
 const baseName=(chunks[0]||"صدای جدید").trim();
 const known=NR_PERSIAN_VOICES[baseName.toLowerCase()];
 let result=known||nrPersianName(baseName);
 if(!known&&chunks.length>1){
   const desc=chunks.slice(1).join(", ").split(/\\s*,\\s*/).map(w=>NR_VOICE_WORDS[w.trim().toLowerCase()]||"").filter(Boolean);
   if(desc.length)result+=" | "+[...new Set(desc)].join("، ");
 }
 const lang=String(v.labels?.language||"").toLowerCase();
 const langNames={en:"انگلیسی",english:"انگلیسی",fa:"فارسی",persian:"فارسی",farsi:"فارسی",
 es:"اسپانیایی",spanish:"اسپانیایی",fr:"فرانسوی",french:"فرانسوی",de:"آلمانی",
 german:"آلمانی",ar:"عربی",arabic:"عربی",hi:"هندی",hindi:"هندی",
 pt:"پرتغالی",portuguese:"پرتغالی",it:"ایتالیایی",italian:"ایتالیایی"};
 const language=langNames[lang]||"";
 return result+(language?" — "+language:"");
}

function renderVoices(items){
 $('nrVoice').replaceChildren();
 for(const v of items){const opt=document.createElement('option');opt.value=v.id;opt.textContent=persianVoiceLabel(v);$('nrVoice').append(opt)}
 if(!$('nrVoice').options.length)$('nrVoice').innerHTML='<option value="">صدایی پیدا نشد</option>';
 loaded=true;$('nrStatus').textContent=items.length?'صداها دریافت شدند. یک صدا را انتخاب و با متن کوتاه آزمایش کنید.':'هیچ صدایی در حساب ElevenLabs پیدا نشد.';
}
async function voices(){ $('nrVoice').innerHTML='<option>در حال دریافت...</option>';try{const r=await narrationFetch({action:'voices'});const j=await r.json();if(!r.ok)throw Error(typeof j.error==='string'?j.error:'خطا');renderVoices(j.voices||[])}catch(e){$('nrVoice').innerHTML='<option value="">خطا در دریافت صداها</option>';$('nrStatus').textContent=e.message}}
// V0319: Navigation is state-driven. Do not snapshot display values that
// can already be "none" from another view; those stale snapshots caused
// the narration panel to disappear on subsequent visits.
const narrationStyle=document.createElement('style');
narrationStyle.textContent='#rfNarrationPage{display:none!important}#rfNarrationPage.active{display:block!important}';
document.head.appendChild(narrationStyle);
function show(){
  // Restore all previously hidden main children before choosing this view.
  main.querySelectorAll(':scope > *').forEach(el=>{
    if(el!==page){
      if(el.hasAttribute('data-nr-display')){
        el.style.display=el.dataset.nrDisplay==='__empty__'?'':el.dataset.nrDisplay;
        delete el.dataset.nrDisplay;
      }
      // Snapshot only after stale narration state is removed.
      el.dataset.nrDisplay=el.style.display||'__empty__';
      el.style.display='none';
    }
  });
  document.getElementById('mu136')?.classList.remove('active');
  page.style.removeProperty('display');
  page.classList.add('active');
  nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
  window.scrollTo(0,0);
}
function hide(){
  page.classList.remove('active');
  page.style.removeProperty('display');
  main.querySelectorAll(':scope > *').forEach(el=>{
    if(el!==page&&el.hasAttribute('data-nr-display')){
      el.style.display=el.dataset.nrDisplay==='__empty__'?'':el.dataset.nrDisplay;
      delete el.dataset.nrDisplay;
    }
  });
}
b.addEventListener('click',e=>{
  e.preventDefault();e.stopImmediatePropagation();
  enterNarration();
});
// Capture phase restores the main view before legacy navigation handlers run.
nav.addEventListener('click',e=>{
  const target=e.target.closest('button');
  if(target&&target!==b)hide();
},true);
$('nrReload').onclick=voices;$('nrText').oninput=()=>{$('nrCount').textContent=$('nrText').value.length.toLocaleString('fa-IR')+' / ۳۵۰۰ نویسه'};
$('nrGenerate').onclick=async()=>{const text=$('nrText').value.trim(),voice_id=$('nrVoice').value;if(!text||!voice_id){$('nrStatus').textContent='متن و صدا را انتخاب کنید.';return}const btn=$('nrGenerate');btn.disabled=true;$('nrStatus').textContent='در حال تولید نریشن...';$('nrDownload').replaceChildren();try{const r=await narrationFetch({action:'generate',text,voice_id,model_id:$('nrModel').value,stability:0.55,similarity:0.8});if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(typeof j.error==='string'?j.error:'خطا در تولید صدا')}const blob=await r.blob();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(blob);$('nrPlayer').src=objectUrl;$('nrPlayer').hidden=false;const a=document.createElement('a');a.href=objectUrl;a.download='RushFinder-Narration.mp3';a.textContent='↓ دانلود MP3';$('nrDownload').append(a);$('nrStatus').textContent='نریشن آماده است.'}catch(e){$('nrStatus').textContent=e.message}finally{btn.disabled=false}};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
