// V0166: relevant, duration-filtered Freesound music with real API pagination.
const CATEGORIES={
 'news broadcast intro':['news broadcast music','news intro instrumental','breaking news theme','broadcast background instrumental','television news music'],
 'political documentary':['political documentary music','political tension music','news background music','documentary cinematic','suspense instrumental'],
 'sports energetic':['sports energetic music','sport instrumental','sports action background','sports highlights music','stadium energetic instrumental'],
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

const IRANIAN=/[؀-ۿ]|\b(persian|iranian|bandari|bandari|iran|farsi|kurdi|kurdish|lori|luri)\b/i;
const IRANIAN_INTENT=/شاد\s*(بندری|ایرانی|جنوبی)|بندری|ایرانی|فارسی|جنوبی|کردی|لری|خواننده|پاپ\s*ایرانی|رقص\s*ایرانی/i;
const iranianTerms=q=>{
 const t=String(q).trim();
 if(/بندری|جنوبی/.test(t))return ['bandari persian dance','iranian bandari','persian southern music'];
 if(/کردی/.test(t))return ['kurdish dance music','kurdish traditional music'];
 if(/لری/.test(t))return ['luri iranian dance','lori persian folk music'];
 if(/شاد|رقص|عروسی/.test(t))return ['persian dance music','iranian party music','persian wedding music'];
 return ['persian music','iranian music',t];
};
const relevantIranian=t=>{
 const hay=[t.name,t.artist,t.description,(t.tags||[]).join(' ')].join(' ');
 return IRANIAN.test(hay);
};
const timeoutFetch=async(url,options={})=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}};
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ');
const isMusic=t=>{const s=normalize([t.name,t.description,(t.tags||[]).join(' ')].join(' '));return !/\b(footsteps|gunshot|gun fire|door slam|siren only|beep|alarm only|voiceover|spoken|speech|sound effect|sfx|one shot|one shot sample|field recording)\b/.test(s)};
async function freesound(terms,page,limit){
 const key=process.env.FREESOUND_API_KEY;if(!key)return {data:[],total:0,available:false};
 const queries=[...new Set(terms.filter(Boolean))];
 const candidates=[];const seen=new Set();let count=0;let successful=0;
 // Use several related phrases when a narrow category returns no usable music.
 // Keep pagination at the provider level and never fabricate tracks.
 for(let i=0;i<Math.min(queries.length,5);i++){
  const url=new URL('https://freesound.org/apiv2/search/text/');
  url.searchParams.set('query',queries[i]);
  url.searchParams.set('fields','id,name,duration,previews,license,url,description,tags');
  url.searchParams.set('filter','duration:[20 TO 900]');
  url.searchParams.set('page_size',String(Math.min(150,Math.max(limit*2,48))));
  url.searchParams.set('page',String(page));
  try{
   const r=await timeoutFetch(url.toString(),{headers:{Authorization:'Token '+key,Accept:'application/json'}});
   if(!r.ok)continue;
   const json=await r.json();successful++;
   count=Math.max(count,Number(json.count)||0);
   for(const t of json.results||[]){
    if(!isMusic(t)||seen.has(t.id))continue;
    const mp3=t.previews?.['preview-hq-mp3']||t.previews?.['preview-lq-mp3'];
    if(!mp3||!/^https:\/\//.test(mp3))continue;
    seen.add(t.id);
    candidates.push({id:'freesound-'+t.id,name:t.name||'بدون عنوان',duration:Number(t.duration)||0,source:'Freesound',license:t.license||'',source_url:t.url||'https://freesound.org/s/'+t.id+'/',files:{mp3},is_premium:false});
   }
   // Collect across related searches to improve diversity; do not stop after the first full source.
  }catch(e){/* Try the next related phrase instead of returning zero. */}
 }
 return {data:candidates,total:Math.max(count,candidates.length),available:successful>0};
}

// Jamendo official public tracks API. Only advertise download for tracks allowed by provider.
async function jamendo(terms,page,limit){
 const id=process.env.JAMENDO_CLIENT_ID;
 if(!id)return {data:[],total:0,available:false};
 const queries=[...new Set(terms.filter(Boolean))].slice(0,5);
 const results=await Promise.allSettled(queries.map(async q=>{
  const url=new URL('https://api.jamendo.com/v3.0/tracks/');
  for(const [k,v] of Object.entries({client_id:id,format:'json',limit:String(Math.min(100,Math.max(limit*2,36))),offset:String((page-1)*Math.min(100,Math.max(limit*2,36))),search:q,audioformat:'mp32'}))url.searchParams.set(k,v);
  const r=await timeoutFetch(url.toString(),{headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Jamendo HTTP '+r.status);
  const j=await r.json();if(j.headers?.status!=='success')throw Error('Jamendo API error');
  return {total:Number(j.headers?.results_fullcount)||0,tracks:(j.results||[]).filter(t=>t.audio&&Number(t.duration)>=20).map(t=>({
   id:'jamendo-'+t.id,name:t.name||'موسیقی',duration:Number(t.duration)||0,source:'Jamendo',artist:t.artist_name||'',license:t.license_ccurl||'',source_url:t.shareurl||'',download_allowed:t.audiodownload_allowed===true||t.audiodownload_allowed==='true',files:{mp3:t.audio,download:t.audiodownload||''},is_premium:false
  }))};
 }));
 const good=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
 const seen=new Set(),data=[];
 for(const result of good)for(const track of result.tracks)if(!seen.has(track.id)){seen.add(track.id);data.push(track)}
 return {data,total:Math.max(data.length,...good.map(r=>r.total),0),available:good.length>0};
}

// Audius public read-only search; no key needed for the initial integration.
async function audius(terms,page,limit){
 const queries=[...new Set(terms.filter(Boolean))].slice(0,3);
 const batch=Math.min(50,Math.max(limit,24));
 const settled=await Promise.allSettled(queries.map(async term=>{
  const url=new URL('https://api.audius.co/v1/tracks/search');
  url.searchParams.set('query',term);url.searchParams.set('limit',String(batch));
  url.searchParams.set('offset',String((page-1)*batch));
  const response=await timeoutFetch(url.toString(),{headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Audius HTTP '+response.status);
  const json=await response.json();
  if(!Array.isArray(json.data))throw Error('Invalid Audius response');
  return json.data;
 }));
 const data=[],seen=new Set();let available=false,more=false;
 for(const result of settled){if(result.status!=='fulfilled')continue;available=true;
  if(result.value.length===batch)more=true;
  for(const t of result.value){
   const id=String(t.id||'');const stream=t.stream?.url;
   if(!id||seen.has(id)||!t.access?.stream||!t.is_streamable||!/^https:\/\//.test(stream||'')||Number(t.duration)<20||Number(t.duration)>900)continue;
   seen.add(id);
   data.push({id:'audius-'+id,name:t.title||'موسیقی',artist:t.user?.name||'',duration:Number(t.duration)||0,source:'Audius',license:t.license||'',source_url:'https://audius.co'+(t.permalink||''),download_allowed:t.access?.download===true && t.is_downloadable===true && !t.is_download_gated,files:{mp3:stream,download:t.access?.download===true && t.is_downloadable===true && !t.is_download_gated ? 'https://api.audius.co/v1/tracks/'+encodeURIComponent(id)+'/download' : ''},is_premium:false});
  }
 }
 return {data,available,hasNext:more};
}

async function existingMusic(terms,page,limit){
 const url=new URL('https://api.freetouse.com/v3/music/tracks/search');url.searchParams.set('query',terms[0]);url.searchParams.set('limit',String(limit));url.searchParams.set('page',String(page));
 try{const r=await timeoutFetch(url.toString(),{headers:{Accept:'application/json'}});if(!r.ok)return [];const j=await r.json();return (Array.isArray(j.data)?j.data:[]).filter(t=>t&&!t.is_premium&&t.files?.mp3&&Number(t.duration)>=30&&Number(t.duration)<=600)}catch{return []}
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','s-maxage=120, stale-while-revalidate=240');
 const q=String(req.query.q||'cinematic soundtrack').slice(0,100),iranian=IRANIAN_INTENT.test(q),terms=iranian?iranianTerms(q):(CATEGORIES[q]||[q, q+' music']);
 const page=Math.max(1,Math.min(200,parseInt(req.query.page,10)||1));
 const limit=[12,24,36].includes(Number(req.query.limit))?Number(req.query.limit):12;
 const [fs,jm,au,legacy]=await Promise.allSettled([freesound(terms,page,limit),jamendo(terms,page,limit),audius(terms,page,limit),existingMusic(terms,page,limit)]);
 const main=fs.status==='fulfilled'?fs.value:{data:[],total:0,available:false};
 const jam=jm.status==='fulfilled'?jm.value:{data:[],total:0,available:false};
 const aud=au.status==='fulfilled'?au.value:{data:[],available:false,hasNext:false};
 const selected=iranian?[...jam.data,...aud.data,...main.data].filter(relevantIranian):[...aud.data,...jam.data,...main.data];const data=[];const ids=new Set();for(const t of selected){const key=String(t.source||'')+'|'+String(t.id||t.files?.mp3);if(!ids.has(key)){ids.add(key);data.push(t)}if(data.length>=limit)break}
 if(!iranian&&data.length<limit&&legacy.status==='fulfilled')for(const t of legacy.value){const id=t.id||t.files?.mp3;if(!ids.has(id)){ids.add(id);data.push(t)}if(data.length>=limit)break}
 if(fs.status==='rejected'&&jm.status==='rejected'&&au.status==='rejected'&&legacy.status==='rejected')return res.status(502).json({error:'ارتباط با منابع موزیک برقرار نشد'});
 // Freesound count is a search-match estimate; some tracks may be filtered out.
 res.status(200).json({data:data.slice(0,limit),total:iranian?data.length:Math.max(data.length,jam.total||0,main.total||0, aud.hasNext?page*limit+1:0),page,limit,hasNext:iranian?false:(aud.hasNext|| (jam.available&&page*limit<jam.total) || (main.available&&page*limit<main.total)),iranianSearch:iranian,sources:{audius:aud.available,jamendo:jam.available,freesound:main.available,existing:legacy.status==='fulfilled'}});
};
