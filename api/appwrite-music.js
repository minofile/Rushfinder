// RushFinder Appwrite storage adapter. No secrets are exposed to the browser.
module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const endpoint=String(process.env.APPWRITE_ENDPOINT||'').replace(/\/+$/,'');
 const project=String(process.env.APPWRITE_PROJECT_ID||'').trim();
 const bucket=String(process.env.APPWRITE_BUCKET_ID||'').trim();
 const key=process.env.APPWRITE_API_KEY;
 if(!endpoint||!project||!bucket)return res.status(503).json({error:'اتصال آرشیو Appwrite هنوز تنظیم نشده است.',configured:false});
 if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/v1)?$/i.test(endpoint))return res.status(500).json({error:'آدرس Appwrite معتبر نیست.'});
 const api=endpoint.endsWith('/v1')?endpoint:endpoint+'/v1';
 const q=String(req.query.q||'').trim().slice(0,100);
 const page=Math.max(1,Math.min(1000,Number(req.query.page)||1));
 const limit=[12,24,36].includes(Number(req.query.limit))?Number(req.query.limit):12;
 const params=new URLSearchParams();
 // Appwrite listFiles accepts a JSON-encoded array of Query strings.
 const queries=[`limit(${limit})`,`offset(${(page-1)*limit})`,`orderDesc("$createdAt")`];
 if(q&&!/^(موزیک|موسیقی|music|all|همه)$/i.test(q))queries.push(`search("name",${JSON.stringify(q)})`);
 queries.forEach(x=>params.append('queries[]',x));
 try{
  const headers={'X-Appwrite-Project':project,'Accept':'application/json'};
  if(key)headers['X-Appwrite-Key']=key;
  const r=await fetch(`${api}/storage/buckets/${encodeURIComponent(bucket)}/files?${params}`,{headers,signal:AbortSignal.timeout(9000)});
  const j=await r.json();
  if(!r.ok)return res.status(r.status===401||r.status===403?503:502).json({error:'دریافت فهرست فایل‌های Appwrite ممکن نشد.',detail:r.status===401||r.status===403?'برای فهرست‌کردن فایل‌ها کلید سمت سرور با دسترسی files.read تنظیم کنید.':j.message||String(r.status)});
  const data=(j.files||[]).filter(f=>/\.(mp3|ogg|oga|wav|m4a|flac)$/i.test(f.name||'')&&/audio\/|application\/octet-stream/i.test(f.mimeType||'audio/mpeg')).map(f=>{
   const base=`${api}/storage/buckets/${encodeURIComponent(bucket)}/files/${encodeURIComponent(f.$id)}`;
   const suffix=`?project=${encodeURIComponent(project)}`;
   return {id:'appwrite-'+f.$id,name:f.name.replace(/\.(mp3|ogg|oga|wav|m4a|flac)$/i,''),artist:'',duration:0,source:'Appwrite',download_allowed:true,is_premium:false,files:{mp3:base+'/view'+suffix,download:base+'/download'+suffix}};
  });
  res.status(200).json({data,total:Number(j.total)||0,totalIsExact:true,hasNext:page*limit<(Number(j.total)||0),page,source:'Appwrite'});
 }catch(e){res.status(502).json({error:'اتصال به Appwrite برقرار نشد.',detail:e.message});}
};
