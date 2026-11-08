import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rf0941-isolated-'));
const apiDir = path.join(testDir, 'api');
fs.mkdirSync(apiDir);
fs.writeFileSync(path.join(testDir, 'package.json'), '{"type":"module"}');
// Intentionally copy only API files; do not copy lib/ folder.
fs.copyFileSync(path.join(root, 'api/youtube-music.js'), path.join(apiDir, 'youtube-music.js'));
fs.copyFileSync(path.join(root, 'api/chat.js'), path.join(apiDir, 'chat.js'));
const keys = ['GEMINI_API_KEY','GOOGLE_GEMINI_API_KEY','GOOGLE_API_KEY','OPENAI_API_KEY','ANTHROPIC_API_KEY','YOUTUBE_API_KEY','YOUTUBE_SMARTEDIT_API_KEY','VECTEEZY_API_KEY','VECTEEZY_ACCOUNT_ID','SMARTEDIT_GEMINI_MODEL'];
const saved = Object.fromEntries(keys.map(k=>[k,process.env[k]]));
const oldFetch = globalThis.fetch;
function response(status, obj) { return { ok: status>=200 && status<300, status, json: async()=>obj }; }
function res() {
  return {code:200, headers:{}, data:null,
    setHeader(k,v){ this.headers[k] = v; return this; },
    status(c){ this.code=c; return this; },
    json(data){ this.data=data; return this; }};
}
try {
  for(const k of keys)delete process.env[k];
  const route=(await import(pathToFileURL(path.join(apiDir, 'youtube-music.js')))).default;
  const chat=(await import(pathToFileURL(path.join(apiDir, 'chat.js')))).default;
  assert.equal(typeof route,'function');
  assert.equal(typeof chat,'function');

  // Regression: route responds with JSON even with no AI keys.
  const noKey=res();
  await route({query:{mode:'smartedit-config'},method:'GET',headers:{}},noKey);
  assert.equal(noKey.code,503);
  assert.equal(noKey.data.code,'GEMINI_NOT_CONFIGURED');

  process.env.GEMINI_API_KEY='local-test-only';
  process.env.YOUTUBE_API_KEY='local-test-only';
  process.env.VECTEEZY_API_KEY='local-test-only';
  process.env.VECTEEZY_ACCOUNT_ID='202455';
  let hits=[];
  globalThis.fetch=async url=>{
    hits.push(String(url));
    if(String(url).includes('/models?'))return response(200,{models:[{name:'models/gemini-3.8-flash', supportedGenerationMethods:['generateContent']}]});
    if(String(url).includes('/resources?'))return response(200,{resources:[{id:123,title:'Street scene',content_type:'video',duration:8}]});
    throw Error('Unexpected external call '+url);
  };
  const config=res();
  await route({query:{mode:'smartedit-config'},method:'GET',headers:{}},config);
  assert.equal(config.code,200);
  assert.equal(config.data.geminiModel,'gemini-3.8-flash');
  assert.equal(config.data.vecteezyConfigured,true);
  assert.equal(config.data.youtubeConfigured,true);
  assert.ok(hits.some(s=>s.includes('/models?')));

  const stock=res();
  await route({query:{mode:'smartedit-vecteezy',q:'street news'},method:'GET',headers:{}},stock);
  assert.equal(stock.code,200);
  assert.equal(stock.data.items[0].provider,'vecteezy');

  // Failover regression: OpenAI is exhausted, Claude responds.
  process.env.OPENAI_API_KEY='local-openai-test';
  process.env.ANTHROPIC_API_KEY='local-claude-test';
  hits=[];
  globalThis.fetch=async (url)=>{
    hits.push(String(url));
    if(String(url).includes('/v1/responses'))return response(429,{error:{code:'insufficient_quota'}});
    if(String(url).includes('/v1/messages'))return response(200,{content:[{type:'text',text:'متن آماده است'}]});
    throw Error('Unexpected external call '+url);
  };
  const fallback=res();
  await chat({method:'POST',headers:{},body:{messages:[{role:'user',content:'سلام'}]}},fallback);
  assert.equal(fallback.code,200);
  assert.equal(fallback.data.provider,'claude');
  assert.equal(fallback.data.text,'متن آماده است');
  assert.equal(hits.length,2);

  console.log('PASS: isolated Vercel API imports without lib/ folder');
  console.log('PASS: JSON response from config endpoint for unset and configured API keys');
  console.log('PASS: Vecteezy search response');
  console.log('PASS: OpenAI to Claude failover');
} finally {
  globalThis.fetch=oldFetch;
  for(const k of keys) { if(saved[k]===undefined)delete process.env[k]; else process.env[k]=saved[k]; }
  fs.rmSync(testDir, {recursive:true, force:true});
}
