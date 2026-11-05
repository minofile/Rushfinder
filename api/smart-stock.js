// RushFinder SmartEdit 0907: licensed-stock metadata ONLY. Never proxy/store user videos.
const limits=new Map(),cache=new Map();
function fail(res,code,message){return res.status(code).json({error:message})}
module.exports=async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return fail(res,405,'فقط GET مجاز است.')}
 const provider=String(req.query.provider||'pexels').toLowerCase();
 if(!['pexels','pixabay','commons'].includes(provider))return fail(res,400,'منبع نامعتبر است.');
 const key=provider==='pixabay'?process.env.PIXABAY_API_KEY:process.env.PEXELS_API_KEY;
 if(provider!=='commons'&&!key)return fail(res,503,provider==='pixabay'?'برای جست‌وجوی Pixabay باید PIXABAY_API_KEY در Vercel ثبت شود.':'برای جست‌وجوی Pexels باید PEXELS_API_KEY در Vercel ثبت شود.');
 const q=String(req.query.q||'').trim();if(!q||q.length>90||/[\x00-\x1f]/.test(q))return fail(res,400,'عبارت جست‌وجو نامعتبر است.');
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].slice(0,120);const now=Date.now();
 if(limits.size>1200){for(const [k,v] of limits)if(now-v.at>60000)limits.delete(k)}
 const state=limits.get(ip)||{at:now,n:0};if(now-state.at>60000){state.at=now;state.n=0}if(++state.n>12)return fail(res,429,'تعداد درخواست‌ها بیش از حد است.');limits.set(ip,state);
 const cacheId=provider+':'+q.toLowerCase();const cached=cache.get(cacheId);if(cached&&now-cached.at<86400000){res.setHeader('Cache-Control','public, max-age=60, s-maxage=3600');return res.status(200).json(cached.payload)}
 const c=new AbortController();const tm=setTimeout(()=>c.abort(),8500);
 try{
  let url,headers={Accept:'application/json'},data;
  if(provider==='commons'){
    // Commons indexes individual file titles/description; full Persian sentences overconstrain search.
    // Try topic + video, then the broad topic by itself if no downloadable result.
    const parts=q.trim().split(/\s+/).filter(Boolean);
    const attempts=[q];if(parts.length>1)attempts.push(parts[0]);
    for(const term of [...new Set(attempts)]){
      url=new URL('https://commons.wikimedia.org/w/api.php');
      for(const [k,v] of Object.entries({action:'query',format:'json',formatversion:'2',generator:'search',gsrsearch:'filetype:video '+term,gsrnamespace:'6',gsrlimit:'32',prop:'imageinfo',iiprop:'url|mime|size|extmetadata',iiurlwidth:'320',iiextmetadatafilter:'LicenseShortName|Artist|UsageTerms'}))url.searchParams.set(k,v);
      const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'RushFinderSmartEdit/0913 (https://rushfinder.vercel.app/)'} ,signal:c.signal});
      if(!response.ok){if(response.status===429)return fail(res,429,'سهمیه جست‌وجوی Commons تمام شده است.');throw Error('Commons HTTP '+response.status)}
      data=await response.json();
      const pages=Array.isArray(data.query?.pages)?data.query.pages:[];
      const valid=pages.map(p=>{
        const m=p.imageinfo?.[0];if(!m)return null;
        let u;try{u=new URL(m.url)}catch{return null}
        const mime=String(m.mime||'');const bytes=Number(m.size||0);
        if(u.protocol!=='https:'||u.hostname!=='upload.wikimedia.org'||!/[.](webm|mp4)$/i.test(u.pathname)||!/^video\/(webm|mp4)$/i.test(mime)||bytes>50e6||bytes<5000)return null;
        const license=String(m.extmetadata?.LicenseShortName?.value||'').replace(/<[^>]+>/g,'').trim().slice(0,90);
        if(!/^(CC ?(?:BY|0)|Public domain|PD)/i.test(license))return null;
        return {id:p.pageid,title:p.title,source:'Wikimedia',page:'https://commons.wikimedia.org/wiki/'+encodeURIComponent(p.title.replace(/ /g,'_')),poster:m.thumburl||'',duration:0,creator:'Wikimedia Commons',license,mime,download:u.href,originalUrl:u.href};
      }).filter(Boolean).slice(0,8);
      if(valid.length){data={videos:valid};break}
      data={videos:[]};
    }
  }
  else if(provider==='pixabay'){
    url=new URL('https://pixabay.com/api/videos/');url.searchParams.set('key',key);url.searchParams.set('q',q);url.searchParams.set('per_page','6');url.searchParams.set('safesearch','true');
    const response=await fetch(url,{headers,signal:c.signal});if(!response.ok)return fail(res,response.status===429?429:502,'سرویس Pixabay پاسخ موفق نداد.');data=await response.json();
  }
  else{
    url=new URL('https://api.pexels.com/v1/videos/search');url.searchParams.set('query',q);url.searchParams.set('per_page','6');headers.Authorization=key;
    const response=await fetch(url,{headers,signal:c.signal});if(!response.ok)return fail(res,response.status===429?429:502,'سرویس Pexels پاسخ موفق نداد.');data=await response.json();
  }
  let videos;
  if(provider==='commons')videos=data.videos||[];
  else if(provider==='pixabay')videos=(data.hits||[]).slice(0,3).map(v=>({id:Number(v.id),source:'Pixabay',page:v.pageURL,poster:v.videos?.medium?.thumbnail||v.videos?.small?.thumbnail||'',duration:Number(v.duration)||0,creator:v.user||'',download:v.videos?.small?.url||v.videos?.medium?.url||null}));
  else videos=(data.videos||[]).slice(0,3).map(v=>{const files=(v.video_files||[]).filter(f=>f.file_type==='video/mp4'&&/^https:\/\//.test(f.link));const f=files.sort((a,b)=>Math.abs((a.width||1280)-1280)-Math.abs((b.width||1280)-1280))[0];return {id:Number(v.id),source:'Pexels',page:v.url,poster:v.image,duration:v.duration,creator:v.user?.name||'',download:f?.link||null}});
  videos=videos.filter(v=>Number.isFinite(v.id)&&v.id>0&&/^https:\/\//.test(v.page)&&/^https:\/\//.test(v.download));
  const payload={videos,source:provider==='commons'?'Wikimedia Commons':provider==='pixabay'?'Pixabay':'Pexels',query:q};if(cache.size>300){for(const [k,v] of cache)if(now-v.at>86400000)cache.delete(k)}cache.set(cacheId,{at:now,payload});
  res.setHeader('Cache-Control','public, max-age=60, s-maxage=3600');return res.status(200).json(payload);
 }catch(e){return fail(res,502,e?.name==='AbortError'?'زمان جست‌وجو به پایان رسید.':'اتصال به منبع ویدئو برقرار نشد.');}finally{clearTimeout(tm)}
}
