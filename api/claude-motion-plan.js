// RushFinder 0942 — Claude motion storyboard generator.
// Claude returns an editable scene plan; rendering/export remains under the user's control.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
 const key=process.env.ANTHROPIC_API_KEY;
 if(!key)return res.status(503).json({ok:false,error:'ANTHROPIC_API_KEY در تنظیمات Vercel ثبت نشده است.'});
 const script=String(req.body?.script||'').trim();
 const duration=Math.max(10,Math.min(300,Number(req.body?.duration)||45));
 const style=String(req.body?.style||'news').slice(0,30);
 if(script.length<20)return res.status(400).json({ok:false,error:'متن نریشن خیلی کوتاه است؛ حداقل ۲۰ نویسه وارد کن.'});
 if(script.length>18000)return res.status(413).json({ok:false,error:'متن بیش از حد طولانی است؛ آن را کوتاه‌تر کن.'});
 const model=process.env.SMARTEDIT_CLAUDE_MODEL||'claude-sonnet-4-5';
 const prompt=`You are a professional motion-graphics director. Turn this Persian narration into an editable storyboard for a Persian news/documentary video. Return ONLY valid JSON: {"projectTitle":"...","scenes":[{"title":"short Persian on-screen headline","visual":"concise visual description for a designed motion-graphics card","duration":number,"type":"title|data|map|timeline|quote|closing","motion":"simple animation direction","narration":"matching excerpt from the supplied script"}]}. Create 5 to 12 scenes, total duration close to ${duration} seconds. Style=${style}. Use only facts present in the narration; do not invent statistics, dates, quotes, or locations. If a chart/map is suggested but exact data is absent, use an illustrative abstract graphic and label it as illustrative. Persian text should be concise and readable. Each scene duration 3-15 seconds. Make each scene visually distinct.`;
 try{
  const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model,max_tokens:3500,system:prompt,messages:[{role:'user',content:script}]})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return res.status(response.status===429?429:502).json({ok:false,error:data?.error?.message||('Claude API HTTP '+response.status)});
  const text=(data.content||[]).filter(x=>x.type==='text').map(x=>x.text||'').join('\n').trim();
  let plan;try{plan=JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a<0||b<a)throw Error('پاسخ Claude JSON معتبر نبود');plan=JSON.parse(text.slice(a,b+1));}
  if(!Array.isArray(plan.scenes)||!plan.scenes.length)throw Error('Claude صحنه‌ای تولید نکرد.');
  plan.scenes=plan.scenes.slice(0,12).map(s=>({title:String(s.title||'صحنه').slice(0,100),visual:String(s.visual||'').slice(0,180),duration:Math.max(3,Math.min(15,Number(s.duration)||5)),type:String(s.type||'title'),motion:String(s.motion||'').slice(0,120),narration:String(s.narration||'').slice(0,500)}));
  return res.status(200).json({ok:true,model,plan});
 }catch(e){return res.status(502).json({ok:false,error:e.message||'خطا در ارتباط با Claude'});}
}
