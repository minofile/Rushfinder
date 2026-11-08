import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
process.env.GEMINI_API_KEY='test-key';
process.env.SMARTEDIT_GEMINI_MODEL='gemini-2.5-flash'; // stale configuration must not break editing
process.env.YOUTUBE_SMARTEDIT_API_KEY='test-youtube';
let listCalls=0,generationCalls=0,chosen=[];
globalThis.fetch=async(url,options={})=>{
 const u=String(url);
 if(u.includes('/v1beta/models?pageSize')){
  listCalls++;
  assert.equal(options.headers['x-goog-api-key'],'test-key');
  return {ok:true,status:200,json:async()=>({models:[
   {name:'models/gemini-2.5-flash',supportedGenerationMethods:['notGenerateContent']},
   {name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']}
  ]})};
 }
 generationCalls++;
 chosen.push(u);
 assert.match(u,/gemini-3\.8-flash:generateContent/);
 assert.equal(options.headers['x-goog-api-key'],'test-key');
 const request=JSON.parse(options.body);
 const parts=request.contents[0].parts;
 const data=parts.some(x=>x.fileData)?{matches:[{index:0,start:4,end:8,confidence:.91,visualEvidence:'Actual city street with moving vehicles and rain'}]}:{segments:[{index:0,query:'city rain emergency',anchors:['rain'],topic:'باران'}]};
 return {ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(data)}]}}]})};
};
const {default:api}=await import(pathToFileURL(path.resolve('api/youtube-music.js')).href);
function res(){return {code:0,body:null,setHeader(){},status(n){this.code=n;return this},json(x){this.body=x;return this}}}
let r=res();await api({method:'GET',query:{mode:'smartedit-config'},headers:{}},r);
assert.equal(r.code,200);assert.equal(r.body.geminiModel,'gemini-3.8-flash');assert.equal(r.body.youtubeConfigured,true);
r=res();await api({method:'POST',query:{mode:'smartedit-vision'},headers:{},body:{videoId:'ABCDEFGHIJK',videoDuration:40,segments:[{index:0,text:'باران در شهر',seconds:4}]}},r);
assert.equal(r.code,200);assert.equal(r.body.matches[0].start,4);
assert.equal(r.body.matches[0].end,8);
assert.equal(listCalls,1);assert.equal(generationCalls,1);
assert.ok(!chosen.some(x=>x.includes('gemini-2.5-flash')));
console.log('PASS expired model auto-replaced with available model; direct YouTube video analysis validated');
