module.exports = async function handler(req,res){
 const q=String(req.query.q||"").trim(),key=process.env.PIXABAY_API_KEY;
 if(!q)return res.status(400).json({error:"عبارت جستجو وارد نشده است."});
 if(!key)return res.status(500).json({error:"PIXABAY_API_KEY در Vercel تنظیم نشده است."});
 const page=Math.max(1,parseInt(req.query.page||"1",10)),perPage=16;
 const quality=String(req.query.quality||"all"),orientation=String(req.query.orientation||"all");
 try{
   // Ask Pixabay for the maximum practical batch and filter using actual returned dimensions.
   const u=new URL("https://pixabay.com/api/videos/");
   u.searchParams.set("key",key);u.searchParams.set("q",q);
   u.searchParams.set("per_page","200");u.searchParams.set("safesearch","true");u.searchParams.set("order","popular");

   const collected=[]; let totalHits=0,total=0;
   // Default Pixabay API exposes a limited number of hits; fetch available pages progressively.
   for(let sp=1;sp<=3;sp++){
     u.searchParams.set("page",String(sp));
     const r=await fetch(u); const data=await r.json();
     if(!r.ok) return res.status(r.status).json({error:data?.message||"Pixabay API error"});
     totalHits=Number(data.totalHits||0); total=Number(data.total||0);
     for(const hit of (data.hits||[])){
       const v=hit.videos||{};
       // choose best available rendition
       const p=v.large?.url?v.large:(v.medium?.url?v.medium:(v.small?.url?v.small:v.tiny));
       const f=v.medium||v.small||v.tiny||p;
       if(!p?.url)continue;
       const w=Number(p.width||0),h=Number(p.height||0),mx=Math.max(w,h),mn=Math.min(w,h);
       let ok=true;
       if(quality==="4k") ok=mx>=3840 && mn>=2160;
       else if(quality==="fhd") ok=mx>=1920 && mn>=1080;
       else if(quality==="hd") ok=mx>=1280 && mn>=720;
       if(orientation==="horizontal")ok=ok&&w>=h;
       if(orientation==="vertical")ok=ok&&h>w;
       if(!ok)continue;
       const video=p.url;
       collected.push({id:hit.id,title:hit.tags||`Pixabay video ${hit.id}`,source:"Pixabay",pageURL:hit.pageURL,
         thumbnail:p.thumbnail||f?.thumbnail||"",duration:hit.duration||0,width:w,height:h,video,
         download:`${video}${video.includes("?")?"&":"?"}download=1`});
     }
     if(sp*200>=totalHits)break;
   }
   const start=(page-1)*perPage;
   const results=collected.slice(start,start+perPage);
   res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
   return res.status(200).json({total,totalAccessible:collected.length,sourceTotalHits:totalHits,page,perPage,results});
 }catch(e){return res.status(500).json({error:"خطا در ارتباط با Pixabay."})}
};