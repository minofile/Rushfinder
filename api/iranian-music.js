// V0186: Persian search across licensed RSS enclosures and official Jamendo API.
// YouTube is deliberately excluded from music results.
const norm=s=>String(s||'').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const translations=[[/بندری|جنوبی/g,'bandari'],[/شاد|رقص|عروسی/g,'dance'],[/غمگین|احساسی/g,'sad'],[/ایرانی|فارسی/g,'persian'],[/سنتی/g,'traditional']];
function queryEnglish(q){let s=norm(q);for(const [re,v] of translations)s=s.replace(re,' '+v+' ');return s.trim()||'persian';}
async function getJson(url){const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),8000);try{const r=await fetch(url,{signal:ctrl.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=240');
 const q=String(req.query.q||'').trim().slice(0,100);if(!q)return res.status(400).json({error:'عبارت جستجو خالی است'});
 const limit=[12,16,24].includes(Number(req.query.limit))?Number(req.query.limit):12;
 const page=Math.max(1,Math.min(100,parseInt(req.query.page,10)||1));
 const id=process.env.JAMENDO_CLIENT_ID;
 const rssUrl='https://'+(req.headers.host||'')+'/api/rss-music?q='+encodeURIComponent(q);
 const requests=[getJson(rssUrl).catch(()=>({data:[],message:'RSS در دسترس نیست'}))];
 if(id){const u=new URL('https://api.jamendo.com/v3.0/tracks/');for(const [k,v] of Object.entries({client_id:id,format:'json',limit:String(limit),offset:String((page-1)*limit),search:queryEnglish(q),audioformat:'mp32'}))u.searchParams.set(k,v);requests.push(getJson(u).catch(()=>({results:[],headers:{status:'error'}})))}
 const [rss,jam]=await Promise.all(requests);const tracks=(rss.data||[]).map(x=>({...x,source:'RSS'}));
 if(jam?.headers?.status==='success')for(const t of jam.results||[]){if(!t.audio)continue;tracks.push({id:'jamendo-'+t.id,name:t.name||'موسیقی',artist:t.artist_name||'',source:'Jamendo',source_url:t.shareurl||'',duration:Number(t.duration)||0,license:t.license_ccurl||'',download_allowed:t.audiodownload_allowed===true,files:{mp3:t.audio,download:t.audiodownload_allowed===true?t.audiodownload||'':''}})}
 const unique=[...new Map(tracks.map(t=>[t.source+'-'+t.id,t])).values()];
 res.status(200).json({data:unique.slice(0,limit),total:unique.length,hasNext:!!(id&&jam?.results?.length===limit),configured:!!id||rss.configured,message:unique.length?'':id?'از منابع صوتی متصل نتیجه‌ای پیدا نشد.':(rss.message||'برای فعال شدن Jamendo متغیر JAMENDO_CLIENT_ID را در Vercel ثبت کنید.')});
}
