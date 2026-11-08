// Official Vecteezy developer API adapter. No scraping, browser keys, or guesses about license rights.
// Docs: https://www.vecteezy.com/api-docs/index.html
import {timingSafeEqual} from 'node:crypto';
const LIMIT=10;
const idOk=id=>/^\d{1,15}$/.test(String(id||''));
const text=(v,n=180)=>String(v??'').slice(0,n);
const asURL=value=>{try{const url=new URL(String(value||''));return url.protocol==='https:'?url.href:''}catch{return ''}};
const field=(obj,...names)=>names.reduce((v,n)=>v??obj?.[n],undefined);
const cache=new Map();
export function vecteezyConfigured(){return Boolean(process.env.VECTEEZY_API_KEY&&process.env.VECTEEZY_ACCOUNT_ID)}
export function workerAccess(token){
 const expected=process.env.RUSHFINDER_WORKER_SHARED_KEY||'';
 if(!expected||!token||typeof token!=='string')return false;
 const a=Buffer.from(expected),b=Buffer.from(token);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function apiURL(route){
 const base=process.env.VECTEEZY_API_BASE_URL||'https://www.vecteezy.com';
 const url=new URL(base);
 if(url.protocol!=='https:'||!(url.hostname==='vecteezy.com'||url.hostname.endsWith('.vecteezy.com'))||url.username||url.password||url.port)throw Error('VECTEEZY_API_BASE_URL باید دامنه رسمی Vecteezy باشد');
 return new URL('/v2/'+encodeURIComponent(process.env.VECTEEZY_ACCOUNT_ID)+route,url);
}
async function request(url){
 const controller=new AbortController(),t=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetch(url,{signal:controller.signal,headers:{Authorization:'Bearer '+process.env.VECTEEZY_API_KEY,'X-API-Key':process.env.VECTEEZY_API_KEY,Accept:'application/json'}});
  const body=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error('Vecteezy API: '+r.status+' '+text(body?.error?.message||body?.message||'',100));e.status=r.status;throw e;}
  return body;
 }finally{clearTimeout(t)}
}
function normalize(raw){
 const x=raw?.resource||raw;
 const id=String(field(x,'id','resource_id')||'');
 if(!idOk(id))return null;
 const type=text(field(x,'content_type','type','resource_type')||'video',40).toLowerCase();
 if(type&&!/(video|footage)/.test(type))return null;
 const title=text(field(x,'title','name','description')||'Vecteezy footage');
 const thumb=field(x,'thumbnail_url','thumbnail','preview_image_url')||x?.previews?.[0]?.url||x?.preview?.url||'';
 const url=asURL(field(x,'url','page_url','permalink')||'');
 const license=text(field(x,'license','license_type')||'unverified',40);
 return {id,provider:'vecteezy',title,thumbnail:asURL(thumb?.url||thumb),url:url||'https://www.vecteezy.com/video/'+id,
   durationSeconds:Number(field(x,'duration','duration_seconds')||0),license,description:text(x?.description||'',300)};
}
export async function searchVecteezy(query){
 if(!vecteezyConfigured()){const e=new Error('برای جست‌وجوی Vecteezy، VECTEEZY_API_KEY و VECTEEZY_ACCOUNT_ID را در Vercel تنظیم کن.');e.status=503;throw e;}
 const q=text(query,90).trim();if(q.length<2){const e=new Error('عبارت جست‌وجوی Vecteezy کوتاه است.');e.status=400;throw e;}
 const key=q.toLowerCase(),old=cache.get(key);
 if(old&&Date.now()-old.at<3600000)return old.result;
 const url=apiURL('/resources');
 // Search parameter names can be adjusted for an API account's version.
 url.searchParams.set(process.env.VECTEEZY_QUERY_PARAM||'qterm',q);
 url.searchParams.set('content_type','video');url.searchParams.set('per_page',String(LIMIT));
 const body=await request(url);
 const list=Array.isArray(body)?body:field(body,'resources','items','results')||body?.data?.resources||body?.data?.items||body?.data||[];
 if(!Array.isArray(list))throw Error('قالب پاسخ API ویتیزی شناخته نشد؛ تنظیمات حساب API را بررسی کن.');
 const result={query:q,provider:'vecteezy',items:list.map(normalize).filter(Boolean).slice(0,LIMIT)};
 cache.set(key,{at:Date.now(),result});if(cache.size>70)cache.delete(cache.keys().next().value);
 return result;
}
function pickDownloadUrl(b){
 const values=[b?.download_url,b?.url,b?.download?.url,b?.download?.download_url,b?.data?.url,
  b?.data?.download_url,b?.resource_download?.url,b?.links?.download,b?.file?.url];
 for(const val of values){const u=asURL(val);if(u)return u}
 return '';
}
export async function resolveVecteezyDownload(id){
 if(!vecteezyConfigured())throw Error('Vecteezy API not configured');
 if(!idOk(id))throw Error('Invalid Vecteezy resource id');
 const body=await request(apiURL('/resources/'+id+'/download'));
 const url=pickDownloadUrl(body);
 if(!url)throw Error('Vecteezy download response has no direct file URL; verify API account permissions and schema.');
 return {url};
}
