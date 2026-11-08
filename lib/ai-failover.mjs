// RushFinder 0938. Server-only AI text router: OpenAI -> Claude -> Gemini.
// No credentials or upstream response bodies are exposed to the browser.
const ROUTE = ['openai', 'claude', 'gemini'];
const modelCache = {name: '', checked: 0};

export function configuredAIProviders(env=process.env) {
  return ROUTE.filter(name => !!keyFor(name, env));
}
function keyFor(provider, env) {
  if(provider==='openai') return env.OPENAI_API_KEY || '';
  if(provider==='claude') return env.ANTHROPIC_API_KEY || '';
  return env.GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
}
function codeFor(e) {
  if(e?.name==='AbortError' || /TIMEOUT|timed out|abort/i.test(String(e?.message || '')))return 'TIMEOUT';
  if(e?.status===429 || /RESOURCE_EXHAUSTED|quota/i.test(String(e?.code||'')))return 'QUOTA';
  if(e?.status===401 || e?.status===403)return 'AUTH';
  if(e?.status===404)return 'MODEL_UNAVAILABLE';
  if(e?.status>=500)return 'SERVICE_ERROR';
  if(e?.status>=400)return 'REQUEST_REJECTED';
  if(/JSON|SCHEMA|EMPTY_RESPONSE|BAD_RESPONSE/.test(String(e?.code||e?.message||'')))return 'BAD_RESPONSE';
  return 'NETWORK_ERROR';
}
export class RFAIUnavailable extends Error {
  constructor(attempts) {
    super('هیچ‌کدام از سرویس‌های OpenAI، Claude و Gemini پاسخ معتبر ندادند. کلیدها، شارژ API و مدل‌های انتخابی را در Vercel بررسی کن.');
    this.name='RFAIUnavailable'; this.attempts=attempts; this.code='AI_PROVIDERS_UNAVAILABLE';
  }
}
function upstreamError(provider, status, code='') {
  const err=new Error(provider+' HTTP '+status);
  err.status=status;err.code=code;return err;
}
async function requestJSON(url,options,timeoutMs) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetch(url,{...options,signal:controller.signal,redirect:'error'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw upstreamError(new URL(url).hostname,response.status,String(data?.error?.status||data?.error?.type||data?.error?.code||''));
    return data;
  }finally {clearTimeout(timer)}
}
function extractOpenAIText(data) {
  if(typeof data.output_text==='string' && data.output_text.trim())return data.output_text;
  return (Array.isArray(data.output)?data.output:[]).flatMap(o=>o.content||[])
   .filter(p=>p.type==='output_text').map(p=>p.text||'').join('\n').trim();
}
function jsonFromText(value) {
  const s=String(value||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try{return JSON.parse(s)}catch(_){const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a<0||b<=a)throw Object.assign(new Error('BAD_RESPONSE JSON'),{code:'BAD_RESPONSE'});return JSON.parse(s.slice(a,b+1))}
}
function normalizeResult(text,schema) {
  if(!String(text||'').trim())throw Object.assign(new Error('EMPTY_RESPONSE'),{code:'EMPTY_RESPONSE'});
  if(!schema)return {text:String(text).trim()};
  let obj;
  try{obj=jsonFromText(text)}catch{throw Object.assign(new Error('BAD_RESPONSE JSON'),{code:'BAD_RESPONSE'})}
  const expected=Object.keys(schema.properties||{});
  if(!obj || typeof obj!=='object' || Array.isArray(obj) || expected.some(k=>!(k in obj) || (schema.properties[k]?.type==='array' && !Array.isArray(obj[k]))))
   throw Object.assign(new Error('BAD_RESPONSE SCHEMA'),{code:'BAD_RESPONSE'});
  return {text:JSON.stringify(obj),json:obj};
}
async function openAI({instructions,input,schema,name,maxOutputTokens,timeoutMs},env) {
  const model=env.SMARTEDIT_OPENAI_MODEL||env.OPENAI_MODEL||'gpt-5.4-mini';
  const body={model,instructions,input,max_output_tokens:maxOutputTokens};
  if(schema)body.text={format:{type:'json_schema',name,strict:true,schema}};
  const data=await requestJSON('https://api.openai.com/v1/responses',{
   method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)
  },timeoutMs);
  return {provider:'openai',model,...normalizeResult(extractOpenAIText(data),schema)};
}
async function claude({instructions,input,schema,maxOutputTokens,timeoutMs},env) {
  const model=env.SMARTEDIT_CLAUDE_MODEL||env.CLAUDE_MODEL||'claude-haiku-5-5';
  const sys=instructions+(schema?'\nReturn ONLY one valid JSON object with the requested fields. No markdown or explanation.':'');
  const data=await requestJSON('https://api.anthropic.com/v1/messages',{
   method:'POST',headers:{'x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','Content-Type':'application/json'},
   body:JSON.stringify({model,max_tokens:maxOutputTokens,system:sys,messages:[{role:'user',content:input}]})
  },timeoutMs);
  const text=(data.content||[]).filter(c=>c.type==='text').map(c=>c.text||'').join('\n');
  return {provider:'claude',model,...normalizeResult(text,schema)};
}
async function geminiModel(env,timeoutMs) {
  const preferred=String(env.GEMINI_TEXT_MODEL||env.SMARTEDIT_GEMINI_MODEL||'').trim();
  if(preferred && !/^gemini-[a-zA-Z0-9.-]+$/.test(preferred))throw Object.assign(new Error('BAD_MODEL'),{code:'BAD_MODEL'});
  if(preferred)return preferred;
  if(modelCache.name&&Date.now()-modelCache.checked<600000)return modelCache.name;
  const key=keyFor('gemini',env);
  const data=await requestJSON('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100',{
   headers:{'x-goog-api-key':key,Accept:'application/json'}
  },Math.min(timeoutMs,7000));
  const models=(data.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>String(m.name||'').replace(/^models\//,''));
  const ordered=['gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash','gemini-2.5-flash'];
  const selected=ordered.find(m=>models.includes(m))||models.find(m=>/^gemini-[\d.]+-flash$/.test(m));
  if(!selected)throw Object.assign(new Error('BAD_MODEL'),{code:'BAD_MODEL'});
  modelCache.name=selected;modelCache.checked=Date.now();return selected;
}
async function gemini({instructions,input,schema,maxOutputTokens,timeoutMs},env) {
  const model=await geminiModel(env,timeoutMs);
  const text=instructions+(schema?'\nReturn ONLY valid JSON, with the exact field names requested.':'')+'\n\n'+input;
  const response=await requestJSON('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
   method:'POST',headers:{'x-goog-api-key':keyFor('gemini',env),'Content-Type':'application/json'},
   body:JSON.stringify({contents:[{role:'user',parts:[{text}]}],generationConfig:{maxOutputTokens, ...(schema?{responseMimeType:'application/json'}:{})}})
  },timeoutMs);
  const output=(response.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').join('\n');
  return {provider:'gemini',model,...normalizeResult(output,schema)};
}
/** Fail over on unavailable, exhausted, unauthorized, timed-out, or malformed provider responses.
 * Never retries the same provider blindly; charges can occur for failed provider calls.
 */
export async function rfAIComplete({instructions,input,schema,name='rushfinder_json',maxOutputTokens=2500,timeoutMs=14500},{env=process.env}={}) {
  if(typeof instructions!=='string'||!instructions.trim()||typeof input!=='string'||!input.trim())throw new Error('AI_INPUT_INVALID');
  const active=configuredAIProviders(env);
  if(!active.length)throw new RFAIUnavailable([]);
  const attempts=[];
  const args={instructions,input,schema,name,maxOutputTokens,timeoutMs};
  for(const provider of active) {
    try {
      const fn={openai:openAI,claude,gemini}[provider];
      const result=await fn(args,env);
      return {...result,attempts};
    }catch(e){attempts.push({provider,reason:codeFor(e)});}
  }
  throw new RFAIUnavailable(attempts);
}
