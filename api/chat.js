export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(500).json({error:"OPENAI_API_KEY در Vercel تنظیم نشده است."});
  try{
    const messages=Array.isArray(req.body?.messages)?req.body.messages.slice(-16):[];
    if(!messages.length) return res.status(400).json({error:"پیامی ارسال نشده است."});
    const input=messages.map(m=>({
      role:m.role==="assistant"?"assistant":"user",
      content:String(m.content||"").slice(0,12000)
    }));
    const body={
      model:process.env.OPENAI_MODEL||"gpt-6-luna",
      instructions:"You are the Persian AI assistant inside RushFinder, a stock-footage search application. Reply in Persian unless the user asks otherwise. Be concise and practical. When the user provides a script or topic and asks for footage, extract concrete visual subjects and propose precise Persian and English stock-footage search queries. Avoid vague suggestions such as 'related images'. Do not claim a footage result exists unless the app has searched for it.",
      input
    };
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data?.error?.message||"OpenAI API error"});
    let text=data.output_text;
    if(!text && Array.isArray(data.output)){
      text=data.output.flatMap(o=>o.content||[]).filter(c=>c.type==="output_text").map(c=>c.text).join("\n");
    }
    return res.status(200).json({text:text||"پاسخی دریافت نشد."});
  }catch(e){
    return res.status(500).json({error:e?.message||"Server error"});
  }
}
