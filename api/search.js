const PIXABAY = "https://pixabay.com/api/videos/";
const VECTEEZY = "https://api.vecteezy.com";

function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function arr(v){ return Array.isArray(v)?v:[]; }
function first(...v){ return v.find(x=>typeof x==="string" && /^https?:\/\//i.test(x)) || ""; }

// V075: Persian query expansion + lightweight relevance ranking.
// This keeps searches such as «امریکا» focused across English-heavy stock providers.
const QUERY_EXPANSIONS = {
  "امریکا": ["امریکا","آمریکا","america","usa","united states","american"],
  "آمریکا": ["آمریکا","امریکا","america","usa","united states","american"],
  "ایالات متحده": ["ایالات متحده","america","usa","united states","american"],
  "طلا": ["طلا","gold","golden"],
  "سکه": ["سکه","coin","gold coin"],
  "نفت": ["نفت","oil","petroleum"],
  "انرژی": ["انرژی","energy"],
  "جنگ": ["جنگ","war","military","combat"],
  "فناوری": ["فناوری","technology","tech"],
  "اقتصاد": ["اقتصاد","economic","economy","finance"],
  "اقتصادی": ["اقتصادی","economic","economy","finance"],
  "سیاسی": ["سیاسی","political","politics"]
};
function queryTerms(q){
  const key=String(q||"").trim().toLowerCase();
  const expanded=QUERY_EXPANSIONS[key]||[key];
  return [...new Set(expanded.map(x=>String(x).trim().toLowerCase()).filter(Boolean))];
}
function providerQuery(q){
  const terms=queryTerms(q);
  // Stock APIs generally understand English better; retain the original too.
  return terms.join(" ");
}
function relevanceScore(item,q){
  const text=[item?.title,item?.tags,item?.description,item?.channelTitle,item?.source].filter(Boolean).join(" ").toLowerCase();
  const terms=queryTerms(q);
  let score=0;
  for(const term of terms){
    if(text.includes(term)) score += term.includes(" ") ? 5 : 3;
    for(const token of term.split(/\s+/)){ if(token.length>2 && text.includes(token)) score += 1; }
  }
  return score;
}
function improveRelevance(results,q){
  const list=Array.isArray(results)?results:[];
  const scored=list.map((item,index)=>({item,index,score:relevanceScore(item,q)}));
  return scored.sort((a,b)=>(b.score-a.score)||(a.index-b.index)).map(x=>x.item);
}

function findFileUrl(obj){
  const all=obj?.file_link_all;
  if(!Array.isArray(all) || !all.length) return "";

  const files=all.map((x,index)=>{
    if(!x || typeof x!=="object") return null;
    const urls=Array.isArray(x.urls)?x.urls:[];
    const url=urls.find(u=>typeof u==="string" && /^https?:\/\//i.test(u))||"";
    const profile=String(x.profile||x.quality||x.label||"");
    const q=parseInt((profile.match(/(\d{3,4})/)||[])[1]||"0",10);
    return url?{url,q,index}:null;
  }).filter(Boolean);

  if(!files.length) return "";
  files.sort((a,b)=>(b.q-a.q)||(b.index-a.index));
  return files[0].url;
}

function highestAparatFileFromMultiSRC(value){
  const found=[];
  const walk=(x)=>{
    if(Array.isArray(x)){ x.forEach(walk); return; }
    if(!x || typeof x!=="object") return;
    let url="";
    for(const k of ["src","url","file","link"]){
      if(typeof x[k]==="string" && /^https?:\/\//i.test(x[k])) { url=x[k]; break; }
    }
    if(url && !/\.m3u8(\?|$)/i.test(url)){
      const label=String(x.label||x.quality||x.profile||x.resolution||"");
      const q=parseInt((label.match(/(\d{3,4})/)||url.match(/(?:^|[^\d])(\d{3,4})p?(?:[^\d]|$)/)||[])[1]||"0",10);
      found.push({url,q});
    }
    Object.values(x).forEach(walk);
  };
  walk(value);
  found.sort((a,b)=>b.q-a.q);
  return found[0]?.url||"";
}

function extractMultiSRCFromHtml(html){
  const keys=["multiSRC","multiSrc","multi_src"];
  for(const key of keys){
    const at=html.indexOf(key);
    if(at<0) continue;
    const tail=html.slice(at, at+250000);
    const first=tail.search(/[\[\{]/);
    if(first<0) continue;
    const text=tail.slice(first);
    const open=text[0], close=open==="["?"]":"}";
    let depth=0, quote="", esc=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quote){
        if(esc){esc=false;continue;}
        if(c==="\\"){esc=true;continue;}
        if(c===quote) quote="";
        continue;
      }
      if(c==="\""||c==="'"){quote=c;continue;}
      if(c===open) depth++;
      else if(c===close){
        depth--;
        if(depth===0){
          let raw=text.slice(0,i+1);
          try{return JSON.parse(raw);}catch(_){
            try{
              raw=raw.replace(/'/g,'"').replace(/,\s*([\]}])/g,"$1");
              return JSON.parse(raw);
            }catch(__){}
          }
          break;
        }
      }
    }
  }
  return null;
}

async function aparatPlayerFallback(uid){
  const pages=[
    `https://www.aparat.com/v/${encodeURIComponent(uid)}`,
    `https://www.aparat.com/video/video/embed/videohash/${encodeURIComponent(uid)}/vt/frame`
  ];
  for(const page of pages){
    try{
      const r=await fetch(page,{headers:{
        "user-agent":"Mozilla/5.0",
        "accept":"text/html,application/xhtml+xml"
      }});
      if(!r.ok) continue;
      const html=await r.text();
      const multi=extractMultiSRCFromHtml(html);
      const direct=highestAparatFileFromMultiSRC(multi);
      if(direct) return direct;

      // Last safe fallback: only full-looking MP4 URLs from player HTML.
      const urls=[...html.matchAll(/https?:\\?\/\\?\/[^"'<>\\\s]+?\.mp4(?:\\?[^"'<>\\\s]*)?/gi)]
        .map(m=>m[0].replace(/\\\//g,"/").replace(/&amp;/g,"&"));
      const clean=[...new Set(urls)].filter(u=>!/(preview|trailer|sample|thumb|sprite)/i.test(u));
      if(clean.length){
        const scored=clean.map(url=>{
          const m=url.match(/(?:^|[^\d])(\d{3,4})p?(?:[^\d]|$)/);
          return {url,q:m?parseInt(m[1],10):0};
        }).sort((a,b)=>b.q-a.q);
        return scored[0].url;
      }
    }catch(_){}
  }
  return "";
}

async function aparatDirectFile(uid){
  // 1) First choice: Aparat's explicit downloadable-file list.
  try{
    const r=await fetch(`https://www.aparat.com/api/fa/v1/video/video/show/videohash/${encodeURIComponent(uid)}`,{
      headers:{"user-agent":"Mozilla/5.0","accept":"application/json"}
    });
    if(r.ok){
      const data=await r.json();
      const included=arr(data?.included);
      const attrs=data?.data?.attributes || data?.data?.[0]?.attributes || included.find(x=>x?.type==="Video")?.attributes || data;
      const url=findFileUrl(attrs);
      if(url) return {url,method:"file_link_all"};
    }
  }catch(_){}

  // 2) Fallback: read the same multi-source information used by Aparat's player.
  const playerUrl=await aparatPlayerFallback(uid);
  if(playerUrl) return {url:playerUrl,method:"player"};

  return {url:""};
}

async function proxyAparatDownload(req,res){
  const uid=String(req.query.uid||"").trim();
  if(!uid) return res.status(400).json({error:"شناسه ویدیو ارسال نشده است."});
  try{
    const direct=await aparatDirectFile(uid);
    if(!direct.url) return res.status(404).json({error:"لینک فایل قابل دانلود برای این ویدیو از آپارات دریافت نشد."});
    const r=await fetch(direct.url);
    if(!r.ok) return res.status(r.status).json({error:"دریافت فایل ویدیو از آپارات ناموفق بود."});
    res.statusCode=200;
    res.setHeader("Content-Type",r.headers.get("content-type")||"video/mp4");
    res.setHeader("Content-Disposition",`attachment; filename="rushfinder-${uid}.mp4"`);
    res.setHeader("Cache-Control","no-store");
    if(r.body && typeof r.body.getReader==="function"){
      const reader=r.body.getReader();
      const pump=async()=>{
        try{
          while(true){
            const {done,value}=await reader.read();
            if(done){res.end();break;}
            res.write(Buffer.from(value));
          }
        }catch(e){if(!res.headersSent)res.statusCode=500;res.end();}
      };
      return pump();
    }
    const buf=Buffer.from(await r.arrayBuffer());
    res.end(buf);
  }catch(e){
    return res.status(500).json({error:e?.message||"خطا در دانلود مستقیم آپارات."});
  }
}function deepUrls(obj, out=[], depth=0){
  if(!obj || depth>5) return out;
  if(typeof obj==="string" && /^https?:\/\//i.test(obj)){ out.push(obj); return out; }
  if(Array.isArray(obj)){ for(const x of obj) deepUrls(x,out,depth+1); return out; }
  if(typeof obj==="object") for(const v of Object.values(obj)) deepUrls(v,out,depth+1);
  return out;
}
function pickUrl(obj, words){
  if(!obj || typeof obj!=="object") return "";
  const keys=Object.keys(obj);
  for(const w of words){
    for(const k of keys){
      if(k.toLowerCase().includes(w)){
        const v=obj[k];
        if(typeof v==="string" && /^https?:\/\//i.test(v)) return v;
        if(v && typeof v==="object"){
          const u=deepUrls(v)[0]; if(u) return u;
        }
      }
    }
  }
  return "";
}
function dims(o){
  const w=num(o?.width ?? o?.dimensions?.width ?? o?.video?.width ?? o?.metadata?.width);
  const h=num(o?.height ?? o?.dimensions?.height ?? o?.video?.height ?? o?.metadata?.height);
  return [w,h];
}
function allowed(w,h,quality,orientation){
  const mx=Math.max(w,h), mn=Math.min(w,h);
  if(quality==="4k" && !(mx>=3840 && mn>=2160)) return false;
  if(quality==="fhd" && !(mx>=1920 && mn>=1080)) return false;
  if(quality==="hd" && !(mx>=1280 && mn>=720)) return false;
  if(orientation==="horizontal" && !(w>=h)) return false;
  if(orientation==="vertical" && !(h>w)) return false;
  return true;
}

async function aparatSearch({q,page,quality,orientation,limit=12}){
  const base=`https://www.aparat.com/api/fa/v1/video/video/search/text/${encodeURIComponent(q)}`;
  let url=base, data=null;
  for(let p=1;p<=page;p++){
    const r=await fetch(url,{headers:{"Accept":"application/json"}});
    data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data?.message||`Aparat API error (${r.status})`);
    const next=data?.data?.[0]?.attributes?.link?.next;
    if(p<page && next) url=next;
    else if(p<page && !next) break;
  }
  const row=data?.data?.[0]||{};
  const included=arr(data?.included);
  const byId=new Map(included.filter(x=>x?.type==="Video").map(x=>[String(x.id),x.attributes||{}]));
  const ids=arr(row?.relationships?.video?.data).map(x=>String(x.id));
  let results=[];
  for(const id of ids){
    const v=byId.get(id);
    if(!v || v.isHidden || v.sensitive) continue;
    const w=num(v?.width), h=num(v?.height), duration=num(v?.duration);
    if(!allowed(w,h,quality,orientation)) continue;
    const uid=String(v.uid||"");
    const pageURL=uid?`https://www.aparat.com/v/${uid}`:`https://www.aparat.com/video/video/view/${id}`;
    const embedURL=uid?`https://www.aparat.com/video/video/embed/videohash/${uid}/vt/frame`:"";
    results.push({
      id, uid, title:v.title||`Aparat video ${id}`, source:"Aparat",
      pageURL, embedURL,
      thumbnail:v.big_poster||v.medium_poster||v.small_poster||"",
      duration, width:w,height:h, video:"",
      download:v.hls_link||"", canDownload:Boolean(v.hls_link),
      views:num(v.visit_cnt_int), channel:v.sender_name||v.username||""
    });
  }
  return {
    results:results.slice(0,limit),
    totalAccessible:num(row?.attributes?.total)||results.length,
    sourceTotalHits:num(row?.attributes?.total)||results.length,
    total:num(row?.attributes?.total)||results.length
  };
}

async function pixabaySearch({q,page,quality,orientation,limit=16}){
  const key=process.env.PIXABAY_API_KEY;
  if(!key) throw new Error("PIXABAY_API_KEY در Vercel تنظیم نشده است.");
  const u=new URL(PIXABAY);
  u.searchParams.set("key",key); u.searchParams.set("q",q);
  u.searchParams.set("per_page","200"); u.searchParams.set("safesearch","true"); u.searchParams.set("order","popular");
  const collected=[]; let totalHits=0,total=0;
  for(let sp=1;sp<=3;sp++){
    u.searchParams.set("page",String(sp));
    const r=await fetch(u); const data=await r.json();
    if(!r.ok) throw new Error(data?.message||"Pixabay API error");
    totalHits=num(data.totalHits); total=num(data.total);
    for(const hit of arr(data.hits)){
      const v=hit.videos||{};
      const p=v.large?.url?v.large:(v.medium?.url?v.medium:(v.small?.url?v.small:v.tiny));
      const f=v.medium||v.small||v.tiny||p;
      if(!p?.url) continue;
      const w=num(p.width),h=num(p.height);
      if(!allowed(w,h,quality,orientation)) continue;
      const video=p.url;
      collected.push({
        id:String(hit.id), title:hit.tags||`Pixabay video ${hit.id}`, source:"Pixabay",
        pageURL:hit.pageURL||"", thumbnail:p.thumbnail||f?.thumbnail||"",
        duration:num(hit.duration), width:w,height:h,video,
        download:`${video}${video.includes("?")?"&":"?"}download=1`
      });
    }
    if(sp*200>=totalHits) break;
  }
  const start=(page-1)*limit;
  return {results:collected.slice(start,start+limit), totalAccessible:collected.length, sourceTotalHits:totalHits, total};
}
function vectItems(data){
  return arr(data?.resources).length?data.resources:
         arr(data?.data).length?data.data:
         arr(data?.results).length?data.results:
         arr(data?.items).length?data.items:[];
}
function vectTotal(data, fallback){
  return num(data?.total ?? data?.total_count ?? data?.meta?.total ?? data?.pagination?.total ?? data?.count) || fallback;
}
function durationSeconds(x){
  const candidates=[
    x?.duration,x?.duration_seconds,x?.durationSeconds,
    x?.video_duration,x?.videoDuration,
    x?.metadata?.duration,x?.metadata?.duration_seconds,
    x?.video?.duration,x?.video?.duration_seconds,
    x?.file?.duration,x?.source?.duration
  ];
  for(const v of candidates){
    if(typeof v==="number" && Number.isFinite(v) && v>0) return Math.round(v);
    if(typeof v==="string" && v.trim()){
      const t=v.trim();
      if(/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t));
      if(/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)){
        const a=t.split(":").map(Number);
        return a.length===3 ? a[0]*3600+a[1]*60+a[2] : a[0]*60+a[1];
      }
    }
  }
  const ms=num(x?.duration_ms ?? x?.durationMs ?? x?.metadata?.duration_ms ?? x?.video?.duration_ms);
  return ms>0 ? Math.round(ms/1000) : 0;
}
function normalizeVecteezy(x){
  const [w,h]=dims(x);
  const urls=deepUrls(x);
  const thumbnail=first(
    pickUrl(x,["thumbnail","thumb","poster","preview_image","image_preview"]),
    urls.find(u=>/\.(jpg|jpeg|png|webp)(\?|$)/i.test(u))
  );
  const video=first(
    pickUrl(x,["preview_video","video_preview","preview_url","preview","video"]),
    urls.find(u=>/\.(mp4|webm|mov)(\?|$)/i.test(u))
  );
  const pageURL=first(
    x?.url,x?.page_url,x?.resource_url,x?.web_url,
    urls.find(u=>/vecteezy\.com/i.test(u) && !/\.(jpg|jpeg|png|webp|mp4|webm|mov)(\?|$)/i.test(u))
  );
  const id=String(x?.id ?? x?.resource_id ?? x?.resourceId ?? "");
  return {
    id,
    title:String(x?.title ?? x?.name ?? x?.description ?? `Vecteezy video ${id}`),
    source:"Vecteezy", pageURL, thumbnail, duration:durationSeconds(x),
    width:w,height:h,video, download:id?`/api/search?action=download&source=vecteezy&id=${encodeURIComponent(id)}`:""
  };
}
async function vecteezySearch({q,page,quality,orientation,limit=16}){
  const key=process.env.VECTEEZY_API_KEY, account=process.env.VECTEEZY_ACCOUNT_ID;
  if(!key) throw new Error("VECTEEZY_API_KEY در Vercel تنظیم نشده است.");
  if(!account) throw new Error("VECTEEZY_ACCOUNT_ID در Vercel تنظیم نشده است.");
  // Fetch up to 100 so video orientation/quality can be filtered locally (Vecteezy orientation filter is not for video).
  const u=new URL(`${VECTEEZY}/v2/${encodeURIComponent(account)}/resources`);
  u.searchParams.set("term",q); u.searchParams.set("content_type","video");
  u.searchParams.set("page",String(page)); u.searchParams.set("per_page","100");
  u.searchParams.set("sort_by","relevance"); u.searchParams.set("family_friendly","true");
  const r=await fetch(u,{headers:{Authorization:`Bearer ${key}`,Accept:"application/json"}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.message||data?.error||`Vecteezy API error (${r.status})`);
  const raw=vectItems(data), normalized=raw.map(normalizeVecteezy).filter(x=>x.id && (x.thumbnail||x.video||x.pageURL));
  const filtered=normalized.filter(x=>allowed(x.width,x.height,quality,orientation));
  const visible=filtered.slice(0,limit);

  // Search responses may omit video duration. For only the visible cards that
  // still have 0 duration, request the documented single-resource endpoint.
  await Promise.all(visible.map(async item=>{
    if(item.duration>0 || !item.id) return;
    try{
      const rr=await fetch(`${VECTEEZY}/v2/${encodeURIComponent(account)}/resources/${encodeURIComponent(item.id)}`,{
        headers:{Authorization:`Bearer ${key}`,Accept:"application/json"}
      });
      if(!rr.ok) return;
      const detail=await rr.json();
      const resource=detail?.resource ?? detail?.data ?? detail;
      const d=durationSeconds(resource);
      if(d>0) item.duration=d;
      // Also improve dimensions/preview if detail contains them.
      const enriched=normalizeVecteezy(resource);
      if(!item.width && enriched.width) item.width=enriched.width;
      if(!item.height && enriched.height) item.height=enriched.height;
      if(!item.video && enriched.video) item.video=enriched.video;
      if(!item.thumbnail && enriched.thumbnail) item.thumbnail=enriched.thumbnail;
      if(!item.pageURL && enriched.pageURL) item.pageURL=enriched.pageURL;
    }catch(_){}
  }));

  return {results:visible, totalAccessible:vectTotal(data,filtered.length), sourceTotalHits:vectTotal(data,raw.length), total:vectTotal(data,raw.length)};
}
async function vecteezyDownload(id,res){
  const key=process.env.VECTEEZY_API_KEY, account=process.env.VECTEEZY_ACCOUNT_ID;
  if(!key||!account) return res.status(500).json({error:"تنظیمات Vecteezy کامل نیست."});
  const u=`${VECTEEZY}/v2/${encodeURIComponent(account)}/resources/${encodeURIComponent(id)}/download`;
  const r=await fetch(u,{headers:{Authorization:`Bearer ${key}`,Accept:"application/json"},redirect:"manual"});
  if(r.status>=300 && r.status<400){
    const loc=r.headers.get("location"); if(loc) return res.redirect(302,loc);
  }
  const data=await r.json().catch(()=>({}));
  if(!r.ok) return res.status(r.status).json({error:data?.message||data?.error||"Vecteezy download error"});
  const url=first(data?.url,data?.download_url,data?.downloadUrl,data?.data?.url,data?.data?.download_url,deepUrls(data)[0]);
  if(!url) return res.status(502).json({error:"لینک دانلود در پاسخ Vecteezy پیدا نشد."});
  return res.redirect(302,url);
}


function isoDurationSeconds(v){
 const m=String(v||"").match(/^P(?:([\d.]+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?$/);
 return m?Math.round(Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0)):0;
}
async function youtubeSearch({q,page,quality,orientation,limit=16}){
 const key=process.env.YOUTUBE_API_KEY;if(!key)throw new Error("YOUTUBE_API_KEY در Vercel تنظیم نشده است.");
 let token="",data={};
 for(let p=1;p<=page;p++){
  const u=new URL("https://www.googleapis.com/youtube/v3/search");
  u.searchParams.set("part","snippet");u.searchParams.set("type","video");u.searchParams.set("q",q);u.searchParams.set("maxResults",String(limit));
  u.searchParams.set("order","relevance");u.searchParams.set("safeSearch","moderate");u.searchParams.set("key",key);
  if(quality!=="all")u.searchParams.set("videoDefinition","high");if(token)u.searchParams.set("pageToken",token);
  const r=await fetch(u);data=await r.json().catch(()=>({}));
  if(!r.ok){
    const reason=data?.error?.errors?.[0]?.reason||"";
    if(reason==="quotaExceeded" || r.status===429) throw new Error("سهمیه روزانه YouTube API تمام شده؛ پس از ریست سهمیه دوباره فعال می‌شود.");
    if(reason==="keyInvalid" || r.status===401) throw new Error("کلید YouTube API معتبر نیست یا در Vercel تنظیم نشده است.");
    if(reason==="accessNotConfigured") throw new Error("YouTube Data API v3 برای این پروژه فعال نیست.");
    throw new Error(data?.error?.message||"خطا در ارتباط با YouTube API");
  }
  if(p<page){token=data.nextPageToken||"";if(!token)break;}
 }
 const items=arr(data.items),ids=items.map(x=>x?.id?.videoId).filter(Boolean),total=num(data?.pageInfo?.totalResults);
 if(!ids.length)return{results:[],totalAccessible:total,sourceTotalHits:total,total};
 const u=new URL("https://www.googleapis.com/youtube/v3/videos");u.searchParams.set("part","contentDetails,snippet");u.searchParams.set("id",ids.join(","));u.searchParams.set("key",key);
 const r=await fetch(u),vd=await r.json().catch(()=>({}));
 if(!r.ok){
   const reason=vd?.error?.errors?.[0]?.reason||"";
   if(reason==="quotaExceeded" || r.status===429) throw new Error("سهمیه روزانه YouTube API تمام شده؛ پس از ریست سهمیه دوباره فعال می‌شود.");
   throw new Error(vd?.error?.message||"خطا در دریافت جزئیات ویدیوهای YouTube");
 }
 const dm=new Map(arr(vd.items).map(x=>[x.id,x]));
 let results=items.map(x=>{const id=x.id.videoId,d=dm.get(id)||{},sn=d.snippet||x.snippet||{},th=sn.thumbnails||{};
  return{id,title:sn.title||`YouTube video ${id}`,source:"YouTube",pageURL:`https://www.youtube.com/watch?v=${id}`,
   thumbnail:th.maxres?.url||th.standard?.url||th.high?.url||th.medium?.url||th.default?.url||"",duration:isoDurationSeconds(d?.contentDetails?.duration),
   width:num(th.maxres?.width||th.high?.width),height:num(th.maxres?.height||th.high?.height),video:"",download:"",canDownload:false};}).filter(x=>x.id);
 if(orientation==="vertical")results=results.filter(x=>x.height>x.width);
 return{results:results.slice(0,limit),totalAccessible:total,sourceTotalHits:total,total};
}


async function searchOneSource(source,args){
  if(source==="youtube") return {...await youtubeSearch(args),sourceLabel:"YouTube"};
  if(source==="vecteezy") return {...await vecteezySearch(args),sourceLabel:"Vecteezy"};
  if(source==="pixabay") return {...await pixabaySearch(args),sourceLabel:"Pixabay"};
  if(source==="aparat") return {...await aparatSearch(args),sourceLabel:"Aparat"};
  return {results:[],totalAccessible:0,sourceTotalHits:0,total:0,sourceLabel:source};
}
function durationOK(item,filter){
  if(filter==="all") return true;
  const d=Number(item?.duration||0);
  if(!Number.isFinite(d)||d<=0) return false;
  return filter==="under1" ? d<60 : d>=60;
}
async function filledMultiSearch({sources,q,page,perPage,quality,orientation,durationFilter,originalQ}){
  // Build a stable virtual result stream by fetching enough provider pages to fill
  // every requested UI page. This prevents page 2/3 becoming short after filters.
  const need=page*perPage;
  const buckets=Object.fromEntries(sources.map(x=>[x,[]]));
  const totals={};
  const maxRounds=Math.max(3,Math.ceil(need/Math.max(1,perPage))*3);
  for(let round=1;round<=maxRounds;round++){
    const jobs=await Promise.allSettled(sources.map(src=>{
      if(src==="youtube" && round>1) return Promise.resolve({results:[],totalAccessible:totals.youtube||0,sourceTotalHits:totals.youtube||0,total:totals.youtube||0,sourceLabel:"YouTube"});
      return searchOneSource(src,{q,page:round,quality,orientation,limit:perPage});
    }));
    jobs.forEach((job,i)=>{
      const src=sources[i]; if(job.status!=="fulfilled") return;
      const val=job.value; totals[src]=num(val.totalAccessible||val.total||val.sourceTotalHits);
      let rows=improveRelevance(arr(val.results),originalQ).filter(x=>durationOK(x,durationFilter));
      const seen=new Set(buckets[src].map(x=>`${x.source}:${x.id||x.uid||x.pageURL}`));
      for(const x of rows){const k=`${x.source}:${x.id||x.uid||x.pageURL}`;if(!seen.has(k)){seen.add(k);buckets[src].push(x)}}
    });
    const available=Object.values(buckets).reduce((n,a)=>n+a.length,0);
    if(available>=need) break;
    const exhausted=sources.every(src=>!totals[src] || buckets[src].length>=totals[src]);
    if(exhausted) break;
  }
  const mixed=[]; let i=0;
  while(mixed.length<need){
    let added=false;
    for(const src of sources){if(buckets[src][i]){mixed.push(buckets[src][i]);added=true;if(mixed.length>=need)break}}
    if(!added)break; i++;
  }
  const start=(page-1)*perPage;
  // Provider totals are the best available count; filtered totals are capped to what
  // can actually be discovered while filling pages, avoiding absurd pagination.
  const rawTotal=Object.values(totals).reduce((a,b)=>a+num(b),0);
  const discovered=Object.values(buckets).reduce((n,a)=>n+a.length,0);
  const totalAccessible=durationFilter==="all"?rawTotal:Math.max(discovered, mixed.length);
  return {results:mixed.slice(start,start+perPage),totalAccessible,sourceTotalHits:rawTotal,total:rawTotal,
    sourceLabel:sources.map(x=>({youtube:"YouTube",aparat:"Aparat",vecteezy:"Vecteezy",pixabay:"Pixabay"}[x]||x)).join(" + ")};
}

module.exports = async function handler(req,res){
  const q=String(req.query.q||"").trim();
  const action=String(req.query.action||"");
  const source=String(req.query.source||"all").toLowerCase();
  if(action==="download" && source==="vecteezy"){
    const id=String(req.query.id||"").trim();
    if(!id) return res.status(400).json({error:"شناسه ویدیو ارسال نشده است."});
    try{return await vecteezyDownload(id,res)}catch(e){return res.status(500).json({error:"خطا در دانلود از Vecteezy."})}
  }
  if(action==="download" && source==="aparat"){
    return proxyAparatDownload(req,res);
  }
  if(!q) return res.status(400).json({error:"عبارت جستجو وارد نشده است."});
  const page=Math.max(1,parseInt(req.query.page||"1",10));
  const requestedPerPage=parseInt(req.query.per_page||"12",10);
  const perPage=[12,24,36].includes(requestedPerPage)?requestedPerPage:12;
  const quality=String(req.query.quality||"all"), orientation=String(req.query.orientation||"all"), durationFilter=String(req.query.duration||"all");
  const searchQ=providerQuery(q);
  try{
    let payload;
    const validSources=["youtube","aparat","vecteezy","pixabay"];
    let requestedSources=source==="all" ? validSources : source.split(",").map(x=>x.trim()).filter(x=>validSources.includes(x));
    if(!requestedSources.length) requestedSources=validSources;
    if(requestedSources.length>1){
      payload=await filledMultiSearch({sources:requestedSources,q:searchQ,page,perPage,quality,orientation,durationFilter,originalQ:q});
    }else{
      payload=await searchOneSource(requestedSources[0],{q:searchQ,page,quality,orientation,limit:perPage});
    }
    // Rank/filter weakly related results before other filters.
    if(Array.isArray(payload?.results)) payload.results=improveRelevance(payload.results,q);

    // Apply duration filter BEFORE sending the response.
    // V063 had this block after `return`, so it never executed.
    if(Array.isArray(payload?.results) && durationFilter!=="all"){
      payload.results=payload.results.filter(item=>{
        const d=Number(item?.duration||0);
        if(!Number.isFinite(d) || d<=0) return false;
        if(durationFilter==="under1") return d < 60;
        if(durationFilter==="over1") return d >= 60;
        return true;
      });
    }

    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({...payload,page,perPage});
    }catch(e){
    return res.status(500).json({error:e?.message||"خطا در ارتباط با سرویس جستجو."});
  }
};
