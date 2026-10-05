const PIXABAY = "https://pixabay.com/api/videos/";
const VECTEEZY = "https://api.vecteezy.com";

function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function arr(v){ return Array.isArray(v)?v:[]; }
function first(...v){ return v.find(x=>typeof x==="string" && /^https?:\/\//i.test(x)) || ""; }

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

async function aparatDirectFile(uid){
  if(!uid) return {url:"",contentType:""};
  const u=`https://www.aparat.com/api/fa/v1/video/video/show/videohash/${encodeURIComponent(uid)}`;
  const r=await fetch(u,{headers:{"Accept":"application/json"}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data?.message||`Aparat detail API error (${r.status})`);
  const included=arr(data?.included);
  const attrs=included.find(x=>x?.type==="Video")?.attributes || data?.data?.[0]?.attributes || data?.data?.attributes || data;
  const url=findFileUrl(attrs);
  return {url,contentType:"video/mp4"};
}

async function proxyAparatDownload(req,res){
  const uid=String(req.query.uid||"").trim();
  if(!uid) return res.status(400).json({error:"شناسه ویدیو ارسال نشده است."});
  try{
    const direct=await aparatDirectFile(uid);
    if(!direct.url) return res.status(404).json({error:"لینک فایل مستقیم MP4 برای این ویدیو در API آپارات ارائه نشده است."});
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
  const r=await fetch(u);data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error?.message||"YouTube API error");
  if(p<page){token=data.nextPageToken||"";if(!token)break;}
 }
 const items=arr(data.items),ids=items.map(x=>x?.id?.videoId).filter(Boolean),total=num(data?.pageInfo?.totalResults);
 if(!ids.length)return{results:[],totalAccessible:total,sourceTotalHits:total,total};
 const u=new URL("https://www.googleapis.com/youtube/v3/videos");u.searchParams.set("part","contentDetails,snippet");u.searchParams.set("id",ids.join(","));u.searchParams.set("key",key);
 const r=await fetch(u),vd=await r.json().catch(()=>({}));if(!r.ok)throw new Error(vd?.error?.message||"YouTube videos API error");
 const dm=new Map(arr(vd.items).map(x=>[x.id,x]));
 let results=items.map(x=>{const id=x.id.videoId,d=dm.get(id)||{},sn=d.snippet||x.snippet||{},th=sn.thumbnails||{};
  return{id,title:sn.title||`YouTube video ${id}`,source:"YouTube",pageURL:`https://www.youtube.com/watch?v=${id}`,
   thumbnail:th.maxres?.url||th.standard?.url||th.high?.url||th.medium?.url||th.default?.url||"",duration:isoDurationSeconds(d?.contentDetails?.duration),
   width:num(th.maxres?.width||th.high?.width),height:num(th.maxres?.height||th.high?.height),video:"",download:"",canDownload:false};}).filter(x=>x.id);
 if(orientation==="vertical")results=results.filter(x=>x.height>x.width);
 return{results:results.slice(0,limit),totalAccessible:total,sourceTotalHits:total,total};
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
  const page=Math.max(1,parseInt(req.query.page||"1",10)), perPage=12;
  const quality=String(req.query.quality||"all"), orientation=String(req.query.orientation||"all");
  try{
    let payload;
    if(source==="youtube"){
      payload=await youtubeSearch({q,page,quality,orientation,limit:perPage}); payload.sourceLabel="YouTube";
    }else if(source==="vecteezy"){
      payload=await vecteezySearch({q,page,quality,orientation,limit:perPage});
      payload.sourceLabel="Vecteezy";
    }else if(source==="pixabay"){
      payload=await pixabaySearch({q,page,quality,orientation,limit:perPage});
      payload.sourceLabel="Pixabay";
    }else if(source==="aparat"){
      payload=await aparatSearch({q,page,quality,orientation,limit:perPage});
      payload.sourceLabel="Aparat";
    }else{
      // "All sources": all four connected providers.
      // In "all sources", ask each provider for a full 12-item batch.
      // Then interleave them and fill the page up to exactly 12 whenever
      // one provider returns fewer results or temporarily fails.
      const [p,v,y,a]=await Promise.allSettled([
        pixabaySearch({q,page,quality,orientation,limit:perPage}),
        vecteezySearch({q,page,quality,orientation,limit:perPage}),
        youtubeSearch({q,page,quality,orientation,limit:perPage}),
        aparatSearch({q,page,quality,orientation,limit:perPage})
      ]);
      const pr=p.status==="fulfilled"?p.value:{results:[],totalAccessible:0,sourceTotalHits:0,total:0};
      const vr=v.status==="fulfilled"?v.value:{results:[],totalAccessible:0,sourceTotalHits:0,total:0};
      const yr=y.status==="fulfilled"?y.value:{results:[],totalAccessible:0,sourceTotalHits:0,total:0};
      const ar=a.status==="fulfilled"?a.value:{results:[],totalAccessible:0,sourceTotalHits:0,total:0};
      const lists=[pr.results,vr.results,yr.results,ar.results];
      const mixed=[];const max=Math.max(...lists.map(x=>x.length));
      for(let i=0;i<max && mixed.length<perPage;i++){
        for(const list of lists){
          if(list[i] && mixed.length<perPage)mixed.push(list[i]);
        }
      }
      payload={results:mixed.slice(0,perPage),
        totalAccessible:num(pr.totalAccessible)+num(vr.totalAccessible)+num(yr.totalAccessible)+num(ar.totalAccessible),
        sourceTotalHits:num(pr.sourceTotalHits)+num(vr.sourceTotalHits)+num(yr.sourceTotalHits)+num(ar.sourceTotalHits),
        total:num(pr.total)+num(vr.total)+num(yr.total)+num(ar.total),
        sourceLabel:"Pixabay + Vecteezy + YouTube + Aparat",
        providerErrors:[p.status==="rejected"?"Pixabay":null,v.status==="rejected"?"Vecteezy":null,y.status==="rejected"?"YouTube":null,a.status==="rejected"?"Aparat":null].filter(Boolean)};
    }
    res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({...payload,page,perPage});
  }catch(e){
    return res.status(500).json({error:e?.message||"خطا در ارتباط با سرویس جستجو."});
  }
};
