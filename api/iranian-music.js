// Non-RSS licensed music provider (Jamendo only). YouTube is separate.
const norm=s=>String(s||'').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const translations=[[/بندری|جنوبی/g,'bandari'],[/شاد|رقص|عروسی/g,'dance'],[/غمگین|احساسی/g,'sad'],[/ایرانی|فارسی/g,'persian'],[/سنتی/g,'traditional']];
function queryEnglish(q){let s=norm(q);for(const [re,v] of translations)s=s.replace(re,' '+v+' ');return s.trim()||'persian'}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=240');
 const q=String(req.query.q||'').trim().slice(0,100);if(!q)return res.status(400).json({error:'عبارت جستجو خالی است'});
 const limit=[12,16,24].includes(Number(req.query.limit))?Number(req.query.limit):12;
 const page=Math.max(1,Math.min(100,parseInt(req.query.page,10)||1));
 const id=process.env.JAMENDO_CLIENT_ID;
 if(!id)return res.status(200).json({data:[],total:0,hasNext:false,configured:false,message:'در آرشیو و منابع صوتی متصل نتیجه‌ای پیدا نشد.'});
 try{
  const u=new URL('https://api.jamendo.com/v3.0/tracks/');
  for(const [k,v] of Object.entries({client_id:id,format:'json',limit:String(limit),offset:String((page-1)*limit),search:queryEnglish(q),audioformat:'mp32'}))u.searchParams.set(k,v);
  const r=await fetch(u,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status);
  const j=await r.json();if(j.headers?.status!=='success')throw Error('Jamendo unavailable');
  const data=(j.results||[]).filter(t=>t.audio).map(t=>({id:'jamendo-'+t.id,name:t.name||'موسیقی',artist:t.artist_name||'',source:'Jamendo',source_url:t.shareurl||'',duration:Number(t.duration)||0,license:t.license_ccurl||'',download_allowed:t.audiodownload_allowed===true,files:{mp3:t.audio,download:t.audiodownload_allowed===true?t.audiodownload||'':''}}));
  return res.status(200).json({data,total:data.length,hasNext:(j.results||[]).length===limit,configured:true,message:data.length?'':'از منابع صوتی متصل نتیجه‌ای پیدا نشد.'});
 }catch(e){return res.status(200).json({data:[],total:0,hasNext:false,configured:true,message:'منبع صوتی در حال حاضر در دسترس نیست.'})}
}
