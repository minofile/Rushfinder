// RushFinder lightweight probe for 9Router tunnel configuration.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED',message:'فقط GET مجاز است.'});
 if(req.query?.probe==='9router'){
   const tunnel=(process.env.RUSH_9ROUTER_TUNNEL_URL||process.env.NINE_ROUTER_TUNNEL_URL||'').trim();
   const apiKey=(process.env.RUSH_9ROUTER_API_KEY||process.env.NINE_ROUTER_API_KEY||'').trim();
   const proxySecret=(process.env.RUSH_9ROUTER_PROXY_SECRET||process.env.RUSH_PROXY_SECRET||'').trim();
   if(!tunnel||!apiKey||!proxySecret){
     const missing=[];
     if(!tunnel)missing.push('RUSH_9ROUTER_TUNNEL_URL');
     if(!apiKey)missing.push('RUSH_9ROUTER_API_KEY');
     if(!proxySecret)missing.push('RUSH_9ROUTER_PROXY_SECRET');
     return res.status(200).json({ok:false,code:'MISSING_ENV',message:'این متغیرها در Vercel تنظیم نشده‌اند: '+missing.join('، ')});
   }
   return res.status(200).json({ok:true,code:'CONFIGURED',message:'تنظیمات اتصال 9Router روی Vercel ثبت شده‌اند. این تست رایگان است و هنوز درخواست تصویر ارسال نمی‌کند.'});
 }
 return res.status(200).json({ok:false,code:'UNKNOWN_PROBE',message:'نوع تست ناشناخته است.'});
}
