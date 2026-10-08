// V0166: relevant, duration-filtered Freesound music with real API pagination.
const CATEGORIES={
 'news broadcast intro':['news broadcast music','news intro instrumental'],
 'political documentary':['political documentary music','serious documentary soundtrack'],
 'sports energetic':['sports energetic music','sport instrumental'],
 'epic orchestral':['epic orchestral music','heroic cinematic soundtrack'],
 'cinematic soundtrack':['cinematic soundtrack music','film score instrumental'],
 'action suspense':['action suspense music','thriller soundtrack'],
 'calm ambient':['calm ambient music','peaceful instrumental'],
 'sad emotional':['sad emotional music','melancholic piano music'],
 'upbeat energetic':['upbeat energetic music','motivational instrumental'],
 'dramatic tension':['dramatic tension music','suspense soundtrack'],
 'technology electronic':['technology electronic music','futuristic electronic soundtrack'],
 'documentary ambient':['documentary background music','documentary ambient soundtrack'],
 'police chase music':['police chase music','crime thriller soundtrack'],
 'crime thriller soundtrack':['crime thriller soundtrack','detective suspense music']
};
const timeoutFetch=async(url,options={})=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}};
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ');
const isMusic=t=>{const s=normalize([t.name,t.description,(t.tags||[]).join(' ')].join(' '));return !/\b(footsteps|gunshot|gun fire|door slam|siren only|beep|alarm only|voiceover|spoken|speech|sound effect|sfx|one shot|one shot sample|field recording)\b/.test(s)};
async function freesound(terms,page,limit){
 const key=process.env.FREESOUND_API_KEY;if(!key)return {data:[],total:0,available:false};
 const url=new URL('https://freesound.org/apiv2/search/text/');
 url.searchParams.set('query',terms[0]);url.searchParams.set('fields','id,name,duration,previews,license,url,description,tags');
 url.searchParams.set('filter','duration:[30 TO 600]');url.searchParams.set('page_size',String(limit));url.searchParams.set('page',String(page));
 const r=await timeoutFetch(url.toString(),{headers:{Authorization:'Token '+key,Accept:'application/json'}});if(!r.ok)throw Error('Freesound HTTP '+r.status);
 const json=await r.json();const data=(json.results||[]).filter(isMusic).map(t=>{const mp3=t.previews?.['preview-hq-mp3']||t.previews?.['preview-lq-mp3'];if(!mp3||!/^https:\/\//.test(mp3))return null;return {id:'freesound-'+t.id,name:t.name||'بدون عنوان',duration:Number(t.duration)||0,source:'Freesound',license:t.license||'',source_url:t.url||'https://freesound.org/s/'+t.id+'/',files:{mp3},is_premium:false}}).filter(Boolean);
 return {data,total:Number(json.count)||data.length,available:true};
}
async function existingMusic(terms,page,limit){
 const url=new URL('https://api.freetouse.com/v3/music/tracks/search');url.searchParams.set('query',terms[0]);url.searchParams.set('limit',String(limit));url.searchParams.set('page',String(page));
 try{const r=await timeoutFetch(url.toString(),{headers:{Accept:'application/json'}});if(!r.ok)return [];const j=await r.json();return (Array.isArray(j.data)?j.data:[]).filter(t=>t&&!t.is_premium&&t.files?.mp3&&Number(t.duration)>=30&&Number(t.duration)<=600)}catch{return []}
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=240');
 const q=String(req.query.q||'cinematic soundtrack').slice(0,100),terms=CATEGORIES[q]||[q];
 const page=Math.max(1,Math.min(200,parseInt(req.query.page,10)||1));
 const limit=[12,16,24].includes(Number(req.query.limit))?Number(req.query.limit):12;
 const [fs,legacy]=await Promise.allSettled([freesound(terms,page,limit),existingMusic(terms,page,limit)]);
 const main=fs.status==='fulfilled'?fs.value:{data:[],total:0,available:false};
 const data=[...main.data];const ids=new Set(data.map(x=>x.id));
 if(data.length<limit&&legacy.status==='fulfilled')for(const t of legacy.value){const id=t.id||t.files?.mp3;if(!ids.has(id)){ids.add(id);data.push(t)}if(data.length>=limit)break}
 if(fs.status==='rejected'&&legacy.status==='rejected')return res.status(502).json({error:'ارتباط با منابع موزیک برقرار نشد'});
 // Freesound count is a search-match estimate; some tracks may be filtered out.
 res.status(200).json({data:data.slice(0,limit),total:main.available?main.total:data.length,page,limit,hasNext:main.available?page*limit<main.total:data.length>=limit,sources:{freesound:main.available,existing:legacy.status==='fulfilled'}});
};
