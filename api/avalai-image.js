// RushFinder 0704 image generation endpoint for AvalAI on Vercel.
// Requires: AVALAI_API_KEY environment variable in Vercel.
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET' && req.query?.probe==='avalai'){
    const hasKey=!!String(process.env.AVALAI_API_KEY||'').trim();
    return res.status(200).json(hasKey
      ? {ok:true,code:'CONFIGURED',message:'کلید AvalAI در Vercel ثبت شده؛ تولید تصویر هنوز آزمایش نشده است.'}
      : {ok:false,code:'MISSING_ENV',message:'متغیر AVALAI_API_KEY در Vercel ثبت نشده است.'}
    );
  }

  if(req.method!=='POST'){
    return res.status(405).json({error:'فقط درخواست POST پذیرفته می‌شود.'});
  }

  const apiKey=String(process.env.AVALAI_API_KEY||'').trim();
  if(!apiKey){
    return res.status(503).json({error:'متغیر AVALAI_API_KEY در Vercel ثبت نشده است.'});
  }

  const prompt=String(req.body?.prompt||'').trim();
  if(prompt.length<30 || prompt.length>3500){
    return res.status(400).json({error:'توضیح تصویر نامعتبر است.'});
  }

  const shape=req.body?.size==='story'?'story':'square';
  const model='gpt-image-2.5-sunburst';
  const payload={
    model,
    prompt,
    n:1,
    size:shape==='story'?'1024x1536':'1024x1024',
    response_format:'b64_json',
    quality:'low'
  };
  if(typeof req.body?.background==='string' && req.body.background.trim()) payload.background=req.body.background.trim();

  const started=Date.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),170000);

  try{
    const upstream=await fetch('https://api.avalai.ir/v1/images/generations',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Accept':'application/json',
        'Authorization':'Bearer '+apiKey
      },
      body:JSON.stringify(payload),
      signal:controller.signal,
      redirect:'error'
    });

    let data=null;
    try{data=await upstream.json();}catch{}

    if(!upstream.ok){
      const rawDetail=data?.error?.message ?? data?.error?.detail ?? data?.detail ?? data?.message ?? data?.error ?? '';
      const detail=(typeof rawDetail==='string'?rawDetail:JSON.stringify(rawDetail||'')).slice(0,650)
        .replace(/(?:sk-|Bearer\s+)[A-Za-z0-9_-]{12,}/gi,'[REDACTED]');
      const retryHeader=upstream.headers.get('retry-after');
      let retryAfterSeconds=null;
      if(retryHeader){
        if(/^\d+$/.test(retryHeader.trim())) retryAfterSeconds=Math.min(3600,Number(retryHeader.trim()));
        else {const t=Date.parse(retryHeader);if(Number.isFinite(t))retryAfterSeconds=Math.min(3600,Math.max(0,Math.ceil((t-Date.now())/1000)));}
      }
      const code=upstream.status;
      const message=code===401?'کلید AvalAI معتبر نیست یا دسترسی ندارد.':
        code===402?'AvalAI اعلام کرده موجودی/اعتبار کافی نیست.':
        code===403?'حساب به مدل انتخابی دسترسی ندارد.':
        code===429?'AvalAI درخواست را محدود کرده است (HTTP 429).':
        'پاسخ ناموفق AvalAI (HTTP '+code+').';
      const responseStatus=[400,401,402,403,404,408,409,422,429].includes(code)?code:502;
      return res.status(responseStatus).json({
        error:message+(detail?' جزئیات: '+detail:''),
        upstreamStatus:code,
        retryAfterSeconds,
        definitiveRejection:[400,401,402,403,404,409,422,429].includes(code)
      });
    }

    const first=data?.data?.[0]||null;
    const b64=first?.b64_json;
    if(typeof b64==='string' && b64.length){
      const mime=['image/png','image/jpeg','image/webp'].includes(first?.media_type)?first.media_type:'image/png';
      return res.status(200).json({
        image:'data:'+mime+';base64,'+b64,
        model,
        elapsedMs:Date.now()-started
      });
    }

    const url=typeof first?.url==='string'?first.url.trim():'';
    if(url){
      try{
        const imageResp=await fetch(url,{headers:{'Accept':'image/*'},signal:controller.signal,redirect:'follow'});
        if(imageResp.ok){
          const contentType=String(imageResp.headers.get('content-type')||'image/png').split(';')[0].trim() || 'image/png';
          const arrayBuffer=await imageResp.arrayBuffer();
          const base64=Buffer.from(arrayBuffer).toString('base64');
          return res.status(200).json({
            image:'data:'+contentType+';base64,'+base64,
            model,
            elapsedMs:Date.now()-started
          });
        }
      }catch{}
      return res.status(200).json({image:url,model,elapsedMs:Date.now()-started});
    }

    return res.status(502).json({error:'تصویر در پاسخ AvalAI وجود نداشت.'});
  }catch(e){
    const message=e?.name==='AbortError'
      ? 'زمان انتظار تصویر در Vercel تمام شد. قبل از تکرار، مصرف اعتبار AvalAI را بررسی کن.'
      : 'ارتباط Vercel با AvalAI برقرار نشد.';
    return res.status(502).json({error:message});
  }finally{
    clearTimeout(timer);
  }
}
