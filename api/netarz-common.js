// RushFinder 591 — API stays on Vercel (no browser API key).
const API='https://netarz.ir/api/ai/v1';
const acceptableOrigin=(req)=>{
 const origin=req.headers.origin; const host=req.headers.host;
 if(!origin||!host)return false;
 try{return new URL(origin).host===host}catch{return false}
};
export async function netarzPost(req,res,path,body){
 if(req.method!=='POST')return res.status(405).json({error:'فقط POST مجاز است.'});
 if(!acceptableOrigin(req))return res.status(403).json({error:'درخواست از دامنه دیگر مجاز نیست.'});
 const key=process.env.NETARZ_API_KEY;
 if(!key)return res.status(503).json({error:'NETARZ_API_KEY برای این محیط Vercel ثبت نشده است.'});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),55000);
 try{
   const response=await fetch(API+path,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
   const data=await response.json().catch(()=>({}));
   if(!response.ok){const reason=typeof data.error==='string'?data.error:data.error?.message||data.message||'پاسخ ناموفق از نت‌ارز';return res.status(response.status>=500?502:response.status).json({error:String(reason).slice(0,450)});}
   return data;
 }finally{clearTimeout(timer)}
}
