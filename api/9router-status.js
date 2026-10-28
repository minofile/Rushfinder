// Configuration check only: no image credits consumed, no secrets returned.
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,code:'METHOD_NOT_ALLOWED'});
 const required=['RUSH_9ROUTER_TUNNEL_URL','RUSH_9ROUTER_API_KEY','RUSH_9ROUTER_PROXY_SECRET'];
 const missing=required.filter(k=>!process.env[k]);
 if(missing.length)return res.status(200).json({ok:false,code:'MISSING_ENV',message:'تنظیمات ناقص است: '+missing.join(', ')});
 return res.status(200).json({ok:true,code:'CONFIGURED',message:'سه تنظیم 9Router در Vercel ثبت شده‌اند. این تست اتصال زنده یا اعتبار مدل را بررسی نمی‌کند.'});
}
