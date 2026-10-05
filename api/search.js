module.exports = async function handler(req,res){
 const q=String(req.query.q||"").trim(), key=process.env.PIXABAY_API_KEY;
 if(!q)return res.status(400).json({error:"عبارت جستجو وارد نشده است."});
 if(!key)return res.status(500).json({error:"PIXABAY_API_KEY در Vercel تنظیم نشده است."});
 const page=Math.max(1,parseInt(req.query.page||"1")), perPage=16;
 const quality=String(req.query.quality||"all"), orientation=String(req.query.orientation||"all");
 try{
   // Fetch a larger source page so filters are applied to real metadata, then expose 16 cards.
   // Pixabay itself caps accessible hits; we never impose a smaller artificial total.
   const sourcePerPage=200;
   const sourcePage=Math.ceil((page*perPage)/sourcePerPage)||1;
   const u=new URL("https://pixabay.com/api/videos/");
   u.searchParams.set("key",key);u.searchParams.set("q",q);u.searchParams.set("page",String(sourcePage));
   u.searchParams.set("per_page",String(sourcePerPage));u.searchParams.set("safesearch","true");u.searchParams.set("order","popular");
   if(quality==="4k"){u.searchParams.set("min_width","3840");u.searchParams.set("min_height","2160")}
   else if(quality==="fhd"){u.searchParams.set("min_width","1920");u.searchParams.set("min_height","1080")}
   else if(quality==="hd"){u.searchParams.set("min_width","1280");u.searchParams.set("min_height","720")}
   const r=await fetch(u),data=await r.json();if(!r.ok)return res.status(r.status).json({error:data?.message||"Pixabay API error"});
   let items=(data.hits||[]).map(hit=>{
     const v=hit.videos||{},p=v.large?.url?v.large:(v.medium?.url?v.medium:(v.small?.url?v.small:v.tiny)),f=v.medium||v.small||v.tiny||p;
     const video=p?.url||f?.url||"";
     return{id:hit.id,title:hit.tags||`Pixabay video ${hit.id}`,source:"Pixabay",pageURL:hit.pageURL,thumbnail:p?.thumbnail||f?.thumbnail||"",duration:hit.duration||0,width:p?.width||0,height:p?.height||0,video,download:video?`${video}${video.includes("?")?"&":"?"}download=1`:""};
   }).filter(x=>x.video);
   if(orientation==="horizontal")items=items.filter(x=>x.width>=x.height);
   if(orientation==="vertical")items=items.filter(x=>x.height>x.width);
   // local offset within the 200-result source page
   const absoluteStart=(page-1)*perPage, localStart=absoluteStart-(sourcePage-1)*sourcePerPage;
   items=items.slice(localStart,localStart+perPage);
   res.setHeader("Cache-Control","s-maxage=86400, stale-while-revalidate=3600");
   return res.status(200).json({total:data.total||0,totalAccessible:data.totalHits||0,page,perPage,results:items});
 }catch(e){return res.status(500).json({error:"خطا در ارتباط با Pixabay."})}
};