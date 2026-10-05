module.exports = async function handler(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "عبارت جستجو وارد نشده است." });
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return res.status(500).json({ error: "PIXABAY_API_KEY در Vercel تنظیم نشده است." });
  try {
    const url = new URL("https://pixabay.com/api/videos/");
    url.searchParams.set("key", key);
    url.searchParams.set("q", q);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("order", "popular");
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.message || "Pixabay API error" });
    const results=(data.hits||[]).map(hit=>{
      const v=hit.videos||{}, p=v.large||v.medium||v.small||v.tiny||{}, f=v.medium||v.small||v.tiny||p;
      const video=p.url||f.url||"";
      return {id:hit.id,title:hit.tags||`Pixabay video ${hit.id}`,source:"Pixabay",pageURL:hit.pageURL,
        thumbnail:hit.picture_id?`https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`:"",
        duration:hit.duration||0,width:p.width||f.width||0,height:p.height||f.height||0,video,
        download:video?`${video}${video.includes("?")?"&":"?"}download=1`:""};
    }).filter(x=>x.video);
    res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({total:data.totalHits||results.length,results});
  } catch(e) { return res.status(500).json({ error: "خطا در ارتباط با Pixabay." }); }
};