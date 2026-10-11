// RushFinder public Appwrite music archive. Only publicly readable files are listed.
module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const endpoint=String(process.env.APPWRITE_ENDPOINT||'https://fra.cloud.appwrite.io/v1').trim().replace(/\/+$/,'');
 const project=String(process.env.APPWRITE_PROJECT_ID||'6aca3a1e0018d4b9fbe9').trim();
 const bucket=String(process.env.APPWRITE_BUCKET_ID||'6aca3a52000d75ea5085').trim();
 const key=String(process.env.APPWRITE_API_KEY||'').trim();
 const api=endpoint.endsWith('/v1')?endpoint:endpoint+'/v1';
 const q=String(req.query.q||'').trim().toLowerCase().slice(0,100);
 const page=Math.max(1,Number(req.query.page)||1);
 const limit=[12,24,36].includes(Number(req.query.limit))?Number(req.query.limit):12;
 const headers={'X-Appwrite-Project':project,'Accept':'application/json'};
 if(key)headers['X-Appwrite-Key']=key;
 try{
  const collected=[];let lastTotal=0;
  for(let batch=0;batch<10;batch++){
   // Appwrite REST expects JSON-serialized Query objects, not DSL strings.
   const params=new URLSearchParams();
   params.append('queries[]',JSON.stringify({method:'limit',values:[100]}));
   params.append('queries[]',JSON.stringify({method:'offset',values:[batch*100]}));
   const r=await fetch(`${api}/storage/buckets/${encodeURIComponent(bucket)}/files?${params}`,{headers,signal:AbortSignal.timeout(9000)});
   const j=await r.json();
   if(!r.ok)return res.status(502).json({error:'دریافت فایل‌های آرشیو انجام نشد.',detail:j.message||String(r.status),status:r.status});
   const files=j.files||[];lastTotal=Number(j.total)||0;collected.push(...files);
   if(files.length<100||collected.length>=lastTotal)break;
  }
  const j={files:collected,total:lastTotal};
  const normalized=x=>String(x||'').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک');
  const all=(j.files||[]).filter(f=>/\.(mp3|ogg|oga|wav|m4a|flac)$/i.test(f.name||''));
  const regionTerms={
   northern:/شمالی|گیلکی|مازندرانی|گیلان|مازندران|تالشی|northern|gilaki|mazandarani|mazandaran|gilan|talysh/i,
   kurdish:/کردی|کردستان|کرمانشاه|سنندج|kurdish|kurdi|kurdistan|kermanshah/i,
   bandari:/بندری|جنوبی|هرمزگان|بندرعباس|bandari|southern|hormozgan|bandarabbas/i
  };
  const requested=Object.keys(regionTerms).find(k=>regionTerms[k].test(q));
  const fileRegion=f=>{
   const name=normalized(f.name||'');
   const explicit=normalized((f.region||f.category||'')+' '+(f.$permissions||[]).join(' '));
   return Object.keys(regionTerms).find(k=>regionTerms[k].test(name+' '+explicit))||'';
  };
  const meaningful=normalized(q).replace(/(?:^|\s)(موزیک|موسیقی|آهنگ)(?=\s|$)/g,' ').trim();
  const matches=(!meaningful||/^(music|all|همه)$/.test(meaningful))?all:requested?all.filter(f=>fileRegion(f)===requested):all.filter(f=>normalized(f.name).includes(meaningful)||meaningful.split(/\s+/).every(w=>normalized(f.name).includes(w)));
  const displayName=raw=>{
   const stem=String(raw||'').replace(/\.(mp3|ogg|oga|wav|m4a|flac)$/i,'');
   const chunks=stem.split(/\s+[-–—]\s+/).map(x=>x.trim()).filter(Boolean);
   // Existing uploads encode category, title and keywords in filename.
   // Display title only, but continue searching the full stored filename.
   if(chunks.length>1){
    const categories=/^(خبری|سیاسی|ورزشی|حماسی|سینمایی|هیجانی|مستند|تکنولوژی|دراماتیک|انرژی|غمگین|آرام|کردی|بندری|شمالی|سایر)$/;
    if(categories.test(chunks[0])){
     const title=chunks[1].replace(new RegExp('^(?:'+chunks[0]+'\\s*[-–—_]?\\s*)+','i'),'').trim();
     return title||chunks[0];
    }
   }
   return stem;
  };
  const categoryOf=f=>{const m=String(f.name||'').match(/^(خبری|سیاسی|ورزشی|حماسی|سینمایی|هیجانی|مستند|تکنولوژی|دراماتیک|انرژی|غمگین|آرام|کردی|بندری|شمالی|سایر)(?:\s*[-–—]\s*|\.)/);return m?m[1]:''};
  const sliced=matches.slice((page-1)*limit,page*limit);
  const data=sliced.map(f=>{const base=`${api}/storage/buckets/${encodeURIComponent(bucket)}/files/${encodeURIComponent(f.$id)}`;const suffix=`?project=${encodeURIComponent(project)}`;return {id:'appwrite-'+f.$id,name:displayName(f.name),artist:'',category:categoryOf(f),region:fileRegion(f),duration:0,source:'Appwrite',download_allowed:true,is_premium:false,files:{mp3:base+'/view'+suffix,download:base+'/download'+suffix}}});
  res.status(200).json({data,total:matches.length,totalIsExact:j.total<=collected.length,hasNext:page*limit<matches.length,page,source:'Appwrite'});
 }catch(e){res.status(502).json({error:'ارتباط با آرشیو موسیقی برقرار نشد.',detail:e.message})}
};
