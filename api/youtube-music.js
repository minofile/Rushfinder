// Search-only integration with the official YouTube Data API.
// Playback uses the official embedded player; no audio extraction or MP3 conversion.
export default async function handler(req,res){
 res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
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
