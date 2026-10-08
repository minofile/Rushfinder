// RushFinder V0173 - Iranian music search via existing Cloudflare Worker.
// Only search metadata and playback URL resolution; no public download proxy.
const WORKER = 'https://rushfinder-music.minofile.workers.dev';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'روش درخواست مجاز نیست'});
  const action=String(req.query.action||'search');
  const upstream=new URL(action==='resolve'?'/api/download':'/api/search',WORKER);
  if(action==='resolve'){
    const audio=String(req.query.audio||'');
    if(!/^[a-zA-Z0-9_-]{10,200}$/.test(audio))return res.status(400).json({error:'شناسه نامعتبر'});
    upstream.searchParams.set('audio',audio);
  }else if(action==='search'){
    const q=String(req.query.q||'').trim();
    if(!q||q.length>100)return res.status(400).json({error:'عبارت جستجو معتبر نیست'});
    upstream.searchParams.set('q',q);
  }else return res.status(400).json({error:'درخواست نامعتبر'});
  try{
    const response=await fetch(upstream,{signal:AbortSignal.timeout(13000)});
    const data=await response.json();
    if(!response.ok||data?.success!==true||data?.data?.ok===false){return res.status(502).json({error:'سرویس موسیقی پاسخ معتبر نداد',detail:String(data?.error||data?.data?.error||''),upstreamStatus:response.status});}
    if(action==='resolve'){
      const link=data.data?.result;
      if(typeof link!=='string'||!/^https:\/\//.test(link))return res.status(502).json({error:'آدرس پخش موجود نیست'});
      return res.status(200).json({url:link});
    }
    const results=Array.isArray(data.data?.result)?data.data.result:[];
    return res.status(200).json({
      data:results.filter(x=>x?.song?.audio?.high||x?.song?.audio?.medium).map(x=>({
        id:String(x.song.id||''), name:String(x.song.title||''),
        artist:(x.song.artists||[]).map(a=>a.fullName).filter(Boolean).join('، '),
        duration:Number(x.song.duration)||0,
        image:x.song.image?.thumbnail?.url||'',
        audioId:x.song.audio.high||x.song.audio.medium,
        source:'ملوبیت', files:{mp3:'melobit:'+String(x.song.audio.high||x.song.audio.medium)}
      })),total:results.length,hasNext:false
    });
  }catch{return res.status(502).json({error:'اتصال به سرویس موسیقی برقرار نشد'});}
}
