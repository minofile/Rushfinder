// RushFinder 0921: three existing music handlers merged into one Vercel function.
// Each handler body is preserved from release 0920.
const handler_audius = (() => {
  const module = { exports: {} };
const {Readable}=require('stream');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).end();
 const id=String(req.query.id||'');
 if(!/^[a-zA-Z0-9]{2,32}$/.test(id))return res.status(400).json({error:'شناسه آهنگ نامعتبر است'});
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),25000);
 try{
  const meta=await fetch('https://api.audius.co/v1/tracks/'+encodeURIComponent(id),{signal:ctrl.signal});
  if(!meta.ok)throw Error('اطلاعات آهنگ در دسترس نیست');
  const j=await meta.json();const t=j.data||{};
  if(!(t.access?.download===true&&t.is_downloadable===true&&!t.is_download_gated))return res.status(403).json({error:'این آهنگ اجازه دانلود ندارد'});
  const r=await fetch('https://api.audius.co/v1/tracks/'+encodeURIComponent(id)+'/download',{signal:ctrl.signal,headers:{Accept:'audio/*,application/octet-stream'}});
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  if(!r.ok||!r.body||!(ct.startsWith('audio/')||ct.includes('octet-stream')))return res.status(502).json({error:'فایل صوتی واقعی از Audius دریافت نشد'});
  res.setHeader('Content-Type',ct);res.setHeader('Content-Disposition','attachment; filename="audius-'+id+'.mp3"');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const stream=Readable.fromWeb(r.body);stream.on('error',()=>res.destroy());stream.pipe(res);
  res.on('close',()=>{clearTimeout(timer);if(!res.writableFinished)ctrl.abort()});
 }catch(e){if(!res.headersSent)res.status(502).json({error:'دانلود این آهنگ در حال حاضر در دسترس نیست'});else res.destroy()}finally{clearTimeout(timer)}
};

  return module.exports;
})();

const handler_freesound = (() => {
  const module = { exports: {} };
// V0167: stream only Freesound's public MP3 preview, avoiding Vercel response-size failures.
const {Readable}=require('stream');
module.exports=async(req,res)=>{
 if(req.method!=='GET')return res.status(405).end();
 const id=String(req.query.id||'');
 if(!/^\d{1,12}$/.test(id))return res.status(400).json({error:'شناسه نامعتبر است'});
 const key=process.env.FREESOUND_API_KEY;
 if(!key)return res.status(503).json({error:'کلید Freesound تنظیم نشده است'});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try{
  const meta=await fetch(`https://freesound.org/apiv2/sounds/${id}/?fields=id,previews,license,name`,{headers:{Authorization:`Token ${key}`},signal:controller.signal});
  if(!meta.ok)return res.status(502).json({error:'اطلاعات این آهنگ از Freesound دریافت نشد'});
  const sound=await meta.json();
  const candidates=[sound.previews?.['preview-hq-mp3'],sound.previews?.['preview-lq-mp3']].filter(u=>typeof u==='string'&&/^https:\/\/(?:[^/]+\.)?freesound\.org\//i.test(u));
  if(!candidates.length)return res.status(404).json({error:'نسخه MP3 این آهنگ در دسترس نیست'});
  let audio=null;
  for(const url of candidates){
   try{const response=await fetch(url,{signal:controller.signal,headers:{Accept:'audio/mpeg,audio/*;q=0.9,*/*;q=0.5'}});
    const type=(response.headers.get('content-type')||'').toLowerCase();
    if(response.ok&&response.body&&!type.includes('json')&&!type.includes('html')&&!type.includes('text/')){audio=response;break}
   }catch(e){if(controller.signal.aborted)throw e}
  }
  if(!audio)return res.status(502).json({error:'سرور Freesound فایل MP3 این آهنگ را ارائه نکرد'});
  res.status(200);
  res.setHeader('Content-Type','audio/mpeg');
  res.setHeader('Content-Disposition',`attachment; filename="freesound-${id}-preview.mp3"`);
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const stream=Readable.fromWeb(audio.body);
  stream.on('error',()=>{if(!res.headersSent)res.status(502).end();else res.destroy()});
  stream.pipe(res);
  res.on('close',()=>{clearTimeout(timer);if(!res.writableFinished)controller.abort()});
 }catch(e){clearTimeout(timer);if(!res.headersSent)return res.status(502).json({error:'دریافت فایل صوتی از منبع انجام نشد'});res.destroy()}
};

  return module.exports;
})();

const handler_appwrite = (() => {
  const module = { exports: {} };
// RushFinder V0212 — Appwrite archive listing. Audio streams directly from Appwrite.
module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
 const endpoint=String(process.env.APPWRITE_ENDPOINT||'https://fra.cloud.appwrite.io/v1').trim().replace(/\/+$/,'');
 const project=String(process.env.APPWRITE_PROJECT_ID||'6aca3a1e0018d4b9fbe9').trim();
 const bucket=String(process.env.APPWRITE_BUCKET_ID||'6aca3a52000d75ea5085').trim();
 const key=String(process.env.APPWRITE_API_KEY||'').trim();
 const api=endpoint.endsWith('/v1')?endpoint:endpoint+'/v1';
 const q=String(req.query.q||'').trim().toLowerCase().slice(0,100);
 const page=Math.max(1,Math.floor(Number(req.query.page)||1));
 const limit=[12,24,36].includes(Number(req.query.limit))?Number(req.query.limit):12;
 const headers={'X-Appwrite-Project':project,'Accept':'application/json'};
 if(key)headers['X-Appwrite-Key']=key;
 try{
  const collected=[];let lastTotal=0;
  for(let batch=0;batch<10;batch++){
   const params=new URLSearchParams();
   params.append('queries[]',JSON.stringify({method:'limit',values:[100]}));
   params.append('queries[]',JSON.stringify({method:'offset',values:[batch*100]}));
   const r=await fetch(`${api}/storage/buckets/${encodeURIComponent(bucket)}/files?${params}`,{headers,signal:AbortSignal.timeout(9000)});
   const j=await r.json();
   if(!r.ok)return res.status(502).json({error:'دریافت فایل‌های آرشیو انجام نشد.',detail:j.message||String(r.status),status:r.status});
   const files=j.files||[];lastTotal=Number(j.total)||0;collected.push(...files);
   if(files.length<100||collected.length>=lastTotal)break;
  }
  const normalized=x=>String(x||'').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک');
  const all=collected.filter(f=>/\.(mp3|ogg|oga|wav|m4a|flac)$/i.test(f.name||''));
  const regionTerms={
   northern:/شمالی|گیلکی|مازندرانی|گیلان|مازندران|تالشی|northern|gilaki|mazandarani|mazandaran|gilan|talysh/i,
   kurdish:/کردی|کردستان|کرمانشاه|سنندج|kurdish|kurdi|kurdistan|kermanshah/i,
   bandari:/بندری|جنوبی|هرمزگان|بندرعباس|bandari|southern|hormozgan|bandarabbas/i
  };
  const requested=Object.keys(regionTerms).find(k=>regionTerms[k].test(q));
  const fileRegion=f=>{
   const name=normalized(f.name||'');
   const explicit=normalized((f.region||f.category||'')+' '+(f.$permissions||[]).join(' '));
   return Object.keys(regionTerms).find(k=>regionTerms[k].test(name+' '+explicit))||'';
  };
  const meaningful=normalized(q).replace(/(?:^|\s)(موزیک|موسیقی|آهنگ)(?=\s|$)/g,' ').trim();
  const matches=(!meaningful||/^(music|all|همه)$/.test(meaningful))?all:requested?all.filter(f=>fileRegion(f)===requested):all.filter(f=>normalized(f.name).includes(meaningful)||meaningful.split(/\s+/).every(w=>normalized(f.name).includes(w)));
  const displayName=raw=>{
   const stem=String(raw||'').replace(/\.(mp3|ogg|oga|wav|m4a|flac)$/i,'');
   const chunks=stem.split(/\s+[-–—]\s+/).map(x=>x.trim()).filter(Boolean);
   if(chunks.length>1){
    const categories=/^(خبری|سیاسی|ورزشی|حماسی|سینمایی|هیجانی|مستند|تکنولوژی|دراماتیک|انرژی|غمگین|آرام|کردی|بندری|شمالی|سایر)$/;
    if(categories.test(chunks[0])){
     const title=chunks[1].replace(new RegExp('^(?:'+chunks[0]+'\\s*[-–—_]?\\s*)+','i'),'').trim();
     return title||chunks[0];
    }
   }
   return stem;
  };
  const categoryOf=f=>{const m=String(f.name||'').match(/^(خبری|سیاسی|ورزشی|حماسی|سینمایی|هیجانی|مستند|تکنولوژی|دراماتیک|انرژی|غمگین|آرام|کردی|بندری|شمالی|سایر)(?:\s*[-–—]\s*|\.)/);return m?m[1]:''};
  const sliced=matches.slice((page-1)*limit,page*limit);
  const data=sliced.map(f=>{const base=`${api}/storage/buckets/${encodeURIComponent(bucket)}/files/${encodeURIComponent(f.$id)}`;const suffix=`?project=${encodeURIComponent(project)}`;return {id:'appwrite-'+f.$id,name:displayName(f.name),artist:'',category:categoryOf(f),region:fileRegion(f),duration:0,source:'Appwrite',download_allowed:true,is_premium:false,files:{mp3:base+'/view'+suffix,download:base+'/download'+suffix}}});
  res.status(200).json({data,total:matches.length,totalIsExact:lastTotal<=collected.length,hasNext:page*limit<matches.length,page,source:'Appwrite'});
 }catch(e){res.status(502).json({error:'ارتباط با آرشیو موسیقی برقرار نشد.',detail:e.message})}
};

  return module.exports;
})();

const handlers = Object.freeze({ audius: handler_audius, freesound: handler_freesound, appwrite: handler_appwrite });
module.exports = async function combinedMusic(req, res) {
  const selector = String((req.query || {}).__rf_music_route || '');
  const handler = handlers[selector];
  if (!handler) return res.status(404).json({ error: 'Unknown music route' });
  return handler(req, res);
};
