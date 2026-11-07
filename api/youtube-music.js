// RushFinder 0924: independent, server-only SmartEdit lookup.
// Reuse this EXISTING API function to stay under the Hobby 12-functions cap.
const rfSmartCalls=new Map();
function rfSmartReply(res,code,object){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 return res.status(code).json(object);
}
async function rfSmartVideoLookup(req,res){
 const key=process.env.YOUTUBE_SMARTEDIT_API_KEY;
 if(!key)return rfSmartReply(res,503,{error:'کلید YOUTUBE_SMARTEDIT_API_KEY در Production تنظیم نشده یا هنوز انتشار جدید انجام نشده است.'});
 const q=String(req.query.q||'').trim().replace(/\s+/g,' ').slice(0,90);
 if(q.length<2)return rfSmartReply(res,400,{error:'متن جست‌وجو کوتاه است.'});
 // Per-instance throttle is best-effort only; protect quota with authenticated use in production.
 const addr=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].slice(0,100);
 const now=Date.now(),recent=(rfSmartCalls.get(addr)||[]).filter(t=>t>now-3600000);
 if(recent.length>=16)return rfSmartReply(res,429,{error:'محدودیت جست‌وجوی آزمایشی این ساعت پر شده است.'});
 recent.push(now);rfSmartCalls.set(addr,recent);
 if(rfSmartCalls.size>250)rfSmartCalls.clear();
 const search=new URL('https://www.googleapis.com/youtube/v3/search');
 Object.entries({part:'snippet',type:'video',q,maxResults:'18',videoEmbeddable:'true',safeSearch:'moderate',key}).forEach(([k,v])=>search.searchParams.set(k,v));
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9500);
 try{
  const result=await fetch(search,{signal:controller.signal,headers:{Accept:'application/json'}});
  const body=await result.json().catch(()=>({}));
  if(!result.ok){
   const google=body.error||{};
   const code=String(google.status||google.errors?.[0]?.reason||result.status).slice(0,60);
   const reason=String(google.message||google.errors?.[0]?.message||('HTTP '+result.status)).replace(/AIza[0-9A-Za-z_-]{20,}/g,'[hidden]').slice(0,170);
   const low=(code+' '+reason).toLowerCase();
   let hint='محدودیت‌ها و فعال بودن YouTube Data API v3 برای پروژه کلید تدوین را بررسی کن.';
   if(/quota|dailylimit/.test(low))hint='سهمیه YouTube Data API پروژه تمام شده است. در Google Cloud بخش Quotas را بررسی کن.';
   else if(/key.*invalid|api_key_invalid/.test(low))hint='کلید YOUTUBE_SMARTEDIT_API_KEY در Vercel معتبر نیست یا اشتباه ذخیره شده است.';
   else if(/disabled|accessnotconfigured|service_blocked/.test(low))hint='YouTube Data API v3 باید در همان پروژه Google Cloud کلید فعال باشد.';
   else if(/referer|ip.*blocked|permission_denied/.test(low))hint='محدودیت Application/API کلید را برای درخواست سروری بررسی کن.';
   return rfSmartReply(res,result.status,{error:'YouTube API: '+reason,code,hint});
  }
  const hits=(body.items||[]).filter(x=>/^[A-Za-z0-9_-]{11}$/.test(x.id?.videoId||''));
  // One cheap videos.list request helps avoid suggested cuts past a video's actual ending.
  // Failure must not break search or reveal API credentials.
  const timing=new Map();
  try {
   const details=new URL('https://www.googleapis.com/youtube/v3/videos');
   Object.entries({part:'contentDetails,status',id:hits.map(x=>x.id.videoId).join(','),key}).forEach(([k,v])=>details.searchParams.set(k,v));
   if(hits.length){const meta=await fetch(details,{signal:controller.signal});if(meta.ok){const detailBody=await meta.json();
    for(const v of detailBody.items||[]){const iso=String(v.contentDetails?.duration||'');const match=iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
     const seconds=match?(+(match[1]||0)*86400+(+(match[2]||0))*3600+(+(match[3]||0))*60+(+(match[4]||0))):0;
     timing.set(v.id,{seconds,embeddable:v.status?.embeddable!==false});
    }
   }}
  }catch(_){}
  return rfSmartReply(res,200,{query:q,items:hits.filter(x=>timing.get(x.id.videoId)?.embeddable!==false).map(x=>({
   id:x.id.videoId,title:String(x.snippet?.title||'بدون عنوان').slice(0,180),
   channel:String(x.snippet?.channelTitle||'').slice(0,90),
   thumbnail:String(x.snippet?.thumbnails?.medium?.url||x.snippet?.thumbnails?.default?.url||'').slice(0,300),
   durationSeconds:timing.get(x.id.videoId)?.seconds||0,
   url:'https://www.youtube.com/watch?v='+x.id.videoId
  }))});
 }catch(err){return rfSmartReply(res,502,{error:'اتصال به یوتیوب ممکن نشد: '+(err.name==='AbortError'?'پایان زمان درخواست':'خطای شبکه')});}
 finally{clearTimeout(timeout)}
}
// Search-only integration with the official YouTube Data API.
// Playback uses the official embedded player; no audio extraction or MP3 conversion.
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(req.query.mode==='smartedit')return rfSmartVideoLookup(req,res);
 const q=String(req.query.q||'').trim().slice(0,100);
 if(!q)return res.status(400).json({error:'عبارت جستجو خالی است'});
 const key=process.env.YOUTUBE_API_KEY;
 if(!key)return res.status(200).json({data:[],message:'برای جستجوی یوتیوب، YOUTUBE_API_KEY را در تنظیمات Vercel ثبت کنید.'});
 try{
  const url=new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part','snippet');url.searchParams.set('type','video');url.searchParams.set('videoEmbeddable','true');url.searchParams.set('maxResults','20');url.searchParams.set('q',q+' آهنگ');url.searchParams.set('key',key);
  const r=await fetch(url);const j=await r.json();
  if(!r.ok)return res.status(502).json({error:j.error?.message||'خطا در جستجوی یوتیوب'});
  const data=(j.items||[]).filter(x=>/^[a-zA-Z0-9_-]{11}$/.test(x.id?.videoId||'')).map(x=>({id:x.id.videoId,title:x.snippet?.title||'',artist:x.snippet?.channelTitle||'',thumbnail:x.snippet?.thumbnails?.medium?.url||'',source:'YouTube',url:'https://www.youtube.com/watch?v='+x.id.videoId}));
  return res.status(200).json({data,total:data.length});
 }catch{return res.status(502).json({error:'اتصال به یوتیوب برقرار نشد'});}
}
