import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=fs.readFileSync('smart-autocut.js','utf8');
const nodes={};
for(const id of ['rfAutoCutReal','rfYTStatus','rfAutoCutSource','rfAutoCutRights','script'])nodes[id]={value:'',checked:false,disabled:false,style:{},textContent:'',addEventListener(type,fn){this.run=fn}};
nodes.rfAutoCutSource.value='youtube'; nodes.rfAutoCutRights.checked=true;
nodes.script.value='باران در تهران باعث ترافیک شدید خیابان‌های شهر شده است.';
let frameCalls=0,imported=null,genCalls=0;
const response=(code,body)=>({ok:code>=200&&code<300,status:code,json:async()=>body});
const fetch=async(url,opts={})=>{
 const u=String(url),data=opts.body?JSON.parse(opts.body):{};
 if(u.endsWith('smartedit-config'))return response(200,{ok:true,geminiModel:'gemini-3.8-flash',youtubeConfigured:true});
 if(u.endsWith('/health'))return response(200,{ok:true});
 if(u.includes('smartedit-analyze'))return response(200,data.task==='plan'?{segments:[{index:0,query:'Tehran rain traffic',anchors:['Tehran'],topic:'traffic'}]}:{matches:[{index:0,ids:['ABCDEFGHIJK']}]});
 if(u.includes('mode=smartedit&q='))return response(200,{items:[{id:'ABCDEFGHIJK',title:'Tehran rain traffic on streets',description:'rain heavy traffic video',durationSeconds:95}]});
 if(u.includes('smartedit-vision'))return response(502,{error:'GEMINI VIDEO INPUT HTTP 400: URL cannot be processed',code:'GEMINI_VIDEO_INPUT_UNAVAILABLE'});
 if(u.endsWith('/frames')){
  frameCalls++;
  return response(200,{duration:95,frames:[{time:13,data:'a'.repeat(200)},{time:16,data:'a'.repeat(200)},{time:20,data:'a'.repeat(200)}]});
 }
 if(u.includes('smartedit-frames')){genCalls++;return response(200,{method:'gemini_aparat_frames',matches:[{start:13,end:19,confidence:.89,visualEvidence:'traffic on wet streets'}]})}
 if(u.endsWith('/jobs'))return response(202,{jobId:'0123456789abcdef0123456789abcdef'});
 if(u.endsWith('/jobs/0123456789abcdef0123456789abcdef'))return response(200,{status:'done',clips:[{start:0,duration:6,url:'http://127.0.0.1:8767/media/0123456789abcdef0123456789abcdef/clip_00.mp4'}]});
 throw Error('Unexpected fetch '+u);
};
const scope={document:{getElementById:(id)=>nodes[id]},fetch,console,Audio:class{},URL:{},
 setTimeout:(fn)=>{fn();return 0},clearTimeout:()=>{},
 window:{rfNarrationFile:null,rfApplyRealAutoCutClips:async(clips)=>{imported=clips;return clips.length},rfYTReset:()=>{}}
};
vm.runInNewContext(root,scope,{filename:'smart-autocut.js'});
assert.equal(typeof nodes.rfAutoCutReal.run,'function');
await nodes.rfAutoCutReal.run();
assert.equal(frameCalls,2,'fallback must sample and refine actual frames');
assert.equal(genCalls,2);
assert.equal(imported.length,1);
assert.match(nodes.rfYTStatus.textContent,/۱|1/);
assert.equal(nodes.rfAutoCutReal.disabled,false);
console.log('PASS end-to-end browser flow: text -> YouTube search -> Gemini 400 -> real-frame fallback -> FFmpeg job -> timeline');
