import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const file=path.resolve('api/youtube-music.js');
process.env.GEMINI_API_KEY='test-not-a-real-key';
const calls=[];
globalThis.fetch=async (url,opts={})=>{
 const req=JSON.parse(opts.body);calls.push({url,opts,req});
 let data;
 if(req.contents[0].parts.some(x=>x.fileData)) data={matches:[{index:0,start:13.5,end:20,confidence:.92,visualEvidence:'Visible ambulance arriving at the scene'}]};
 else if(req.contents[0].parts.some(x=>x.inlineData))data={transcript:'صدای آزمایشی فارسی'};
 else if(req.contents[0].parts[0].text.includes('STRICTLY relevant'))data={segments:[{index:0,query:'Tehran ambulance footage',anchors:['Tehran','ambulance'],topic:'آمبولانس'}]};
 else data={matches:[{index:0,ids:['a1b2c3d4e5F'],reason:'Matches specific event'}]};
 return {ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(data)}]}}]})};
};
const {default:handler}=await import(pathToFileURL(file).href);
function res(){return {code:0,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(d){this.body=d;return this}}}
let response=res();await handler({method:'POST',query:{mode:'smartedit-analyze'},body:{task:'plan',segments:[{text:'ماموران امدادی در تهران وارد شدند'}]}},response);
assert.equal(response.code,200);assert.equal(response.body.provider,'gemini');assert.equal(response.body.segments[0].query,'Tehran ambulance footage');
response=res();await handler({method:'POST',query:{mode:'smartedit-vision'},body:{videoId:'a1b2c3d4e5F',videoDuration:90,segments:[{index:0,text:'آمبولانس امدادی',seconds:6}]}},response);
assert.equal(response.code,200);assert.equal(response.body.method,'gemini_video_frames');assert.equal(response.body.matches[0].start,13.5);
assert.equal(calls.at(-1).req.contents[0].parts[0].fileData.fileUri,'https://www.youtube.com/watch?v=a1b2c3d4e5F');
response=res();await handler({method:'POST',query:{mode:'smartedit-transcribe'},body:{audioBase64:Buffer.alloc(90,12).toString('base64'),mimeType:'audio/mpeg'}},response);
assert.equal(response.code,200);assert.equal(response.body.transcript,'صدای آزمایشی فارسی');
response=res();await handler({method:'POST',query:{mode:'smartedit-vision'},body:{videoId:'wrong',segments:[{index:0,text:'bad'}]}},response);
assert.equal(response.code,400);
for(const call of calls){assert.equal(call.opts.headers['x-goog-api-key'],'test-not-a-real-key');assert.ok(!JSON.stringify(call.req).includes('test-not-a-real-key'))}
console.log('PASS Gemini plan + video-frame timestamp + narration transcription + input validation + key isolation');
