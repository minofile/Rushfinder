 'use strict';
const crypto=require('crypto');
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.RF_TAG_SIGNING_KEY||'',pin=process.env.RF_TAG_ACCESS_CODE||'',base=process.env.RF_TAG_GATEWAY_URL||'';
 if(key.length<32||pin.length<12||!/^https:\/\/[a-z0-9.-]+\/?$/i.test(base))return res.status(503).json({error:'مدیر سایت هنوز اتصال مرکزی تگ خبر را کامل تنظیم نکرده است.'});
 const given=String(req.headers['x-rf-tag-access']||'');
 const b1=Buffer.from(pin),b2=Buffer.from(given);
 if(b1.length!==b2.length||!crypto.timingSafeEqual(b1,b2))return res.status(401).json({error:'کد دسترسی بخش تگ خبر نادرست است.'});
 const payload=Buffer.from(JSON.stringify({scope:'tag-render',exp:Date.now()+45*60*1000,nonce:crypto.randomBytes(12).toString('hex')})).toString('base64url');
 const sig=crypto.createHmac('sha256',key).update(payload).digest('base64url');
 return res.status(200).json({gateway:base.replace(/\/$/,''),ticket:payload+'.'+sig,expiresInSeconds:2700});
};
