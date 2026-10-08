// V0163: Freesound API added to existing music source (no secret in client code).
const CATEGORIES={"news broadcast intro":["news intro","broadcast music"],"political documentary":["political documentary","serious cinematic"],"sports energetic":["sport energetic","sport music"],"epic orchestral":["epic orchestral","heroic soundtrack"],"cinematic soundtrack":["cinematic soundtrack","film music"],"action suspense":["action suspense","thriller music"],"calm ambient":["calm ambient","peaceful music"],"sad emotional":["sad emotional","melancholic piano"],"upbeat energetic":["upbeat energetic","motivational music"],"dramatic tension":["dramatic tension","suspense music"],"technology electronic":["technology electronic","futuristic music"],"documentary ambient":["documentary background","ambient documentary"]};
const timeoutFetch=async(url,options={})=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}};
async function freesound(q){
 const key=process.env.FREESOUND_API_KEY;
 if(!key)return [];
 const url=new URL('https://freesound.org/apiv2/search/text/');
 url.searchParams.set('query',q);
 url.searchParams.set('fields','id,name,duration,previews,license,url,description');
 url.searchParams.set('filter','type:mp3 OR type:wav');
 url.searchParams.set('page_size','30');
 const response=await timeoutFetch(url.toString(),{headers:{Authorization:'Token '+key,Accept:'application/json'}});
 if(!response.ok)throw Error('Freesound HTTP '+response.status);
 const json=await response.json();
 return (Array.isArray(json.results)?json.results:[]).map(t=>{
  const preview=t.previews?.['preview-hq-mp3']||t.previews?.['preview-lq-mp3'];
  if(!preview||!/^https:\/\//i.test(preview))return null;
  return {id:'freesound-'+t.id,duration:Number(t.duration)||0,source:'Freesound',license:t.license||'',source_url:t.url||'https://freesound.org/s/'+t.id+'/',name:t.name||'',files:{mp3:preview},is_premium:false};
 }).filter(Boolean);
}
async function existingMusic(terms){
 const sets=await Promise.all(terms.map(async term=>{try{const url=new URL('https://api.freetouse.com/v3/music/tracks/search');url.searchParams.set('query',term);url.searchParams.set('limit','24');const response=await timeoutFetch(url.toString(),{headers:{Accept:'application/json'}});if(!response.ok)return [];const json=await response.json();return Array.isArray(json.data)?json.data:[]}catch{return []}}));
 return sets.flat().filter(t=>t&&!t.is_premium&&t.files?.mp3);
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
 const q=String(req.query.q||'cinematic').slice(0,100);
 const terms=CATEGORIES[q]||[q];
 const [fs,legacy]=await Promise.allSettled([freesound(terms[0]),existingMusic(terms)]);
 const seen=new Set(),data=[];
 for(const list of [fs.status==='fulfilled'?fs.value:[],legacy.status==='fulfilled'?legacy.value:[]])for(const t of list){const id=t.id||t.files?.mp3;if(!id||seen.has(id))continue;seen.add(id);data.push(t)}
 if(!data.length&&fs.status==='rejected'&&legacy.status==='rejected')return res.status(502).json({error:'ارتباط با منابع موزیک برقرار نشد'});
 return res.status(200).json({data:data.slice(0,48),sources:{freesound:fs.status==='fulfilled',existing:legacy.status==='fulfilled'}});
};
