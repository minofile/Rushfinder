import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import handler from '../api/youtube-music.js';
import {workerAccess,searchVecteezy} from '../lib/vecteezy.mjs';
Object.assign(process.env,{
 VECTEEZY_API_KEY:'test-key', VECTEEZY_ACCOUNT_ID:'123456',
 RUSHFINDER_WORKER_SHARED_KEY:'secret-used-only-for-tests'
});
const response=(code,body)=>({ok:code>=200&&code<300,status:code,json:async()=>body});
const seen=[];
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);seen.push(u);
 assert.equal(new URL(u).hostname,'www.vecteezy.com');
 assert.equal(opts.headers.Authorization,'Bearer test-key');
 if(u.includes('/download'))return response(200,{download_url:'https://stock-files.vecteezy.com/a.mp4'});
 return response(200,{resources:[{id:321,title:'rain in Tehran',content_type:'video',duration:24,url:'https://www.vecteezy.com/video/321'}]});
};
const result=await searchVecteezy('rain in Tehran');
assert.equal(result.items[0].provider,'vecteezy');
assert.equal(result.items[0].id,'321');
assert.match(seen[0],/\/v2\/123456\/resources\?/);
assert.equal(workerAccess('wrong'),false);assert.equal(workerAccess('secret-used-only-for-tests'),true);
function res(){return {code:0,body:null,setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}}}
const r=res();await handler({method:'GET',query:{mode:'smartedit-vecteezy',q:'rain in Tehran'}},r);
assert.equal(r.code,200);assert.equal(r.body.items[0].id,'321');
const no=res();await handler({method:'POST',query:{mode:'smartedit-vecteezy-download'},headers:{},body:{id:'321'}},no);
assert.equal(no.code,403);
process.env.VECTEEZY_DOWNLOAD_ALLOWED='true';
const yes=res();await handler({method:'POST',query:{mode:'smartedit-vecteezy-download'},headers:{'x-rushfinder-worker-key':'secret-used-only-for-tests'},body:{id:'321'}},yes);
assert.equal(yes.code,200);assert.match(yes.body.url,/vecteezy.com\/a.mp4/);
// Full mocked browser flow: Vecteezy selected -> visual frame confirmation -> real clip timeline.
const nodes={};
for(const id of ['rfAutoCutReal','rfYTStatus','rfAutoCutSource','rfAutoCutRights','rfVecteezyPaid','script'])nodes[id]={value:'',checked:false,disabled:false,style:{},textContent:'',addEventListener(type,fn){this.run=fn}};
nodes.rfAutoCutSource.value='vecteezy';nodes.rfAutoCutRights.checked=true;nodes.rfVecteezyPaid.checked=true;
nodes.script.value='باران شدید باعث اختلال در ترافیک شد.';
let imported=null,frameCalls=0;
const fakeFetch=async(url,opts={})=>{
 const u=String(url),data=opts.body?JSON.parse(opts.body):{};
 if(u.endsWith('smartedit-config'))return response(200,{ok:true,geminiModel:'gemini-test',vecteezyConfigured:true,vecteezyWorkerReady:true});
 if(u.endsWith('/health'))return response(200,{ok:true,vecteezyWorkerReady:true});
 if(u.includes('smartedit-analyze'))return response(200,{segments:[{index:0,query:'rain in Tehran',anchors:['rain']}]});
 if(u.includes('smartedit-vecteezy&q='))return response(200,{items:[{id:'321',title:'Rain street footage',provider:'vecteezy'}]});
 if(u.endsWith('/frames')){frameCalls++;assert.equal(data.provider,'vecteezy');return response(200,{frames:[{time:2,data:'abc'}]})}
 if(u.includes('smartedit-frames'))return response(200,{method:'gemini_aparat_frames',matches:[{start:2,end:7,confidence:.93,visualEvidence:'Rain on street'}]});
 if(u.endsWith('/jobs')){assert.equal(data.clips[0].provider,'vecteezy');return response(202,{jobId:'0123456789abcdef0123456789abcdef'})}
 if(u.endsWith('/jobs/0123456789abcdef0123456789abcdef'))return response(200,{status:'done',clips:[{start:0,duration:5,url:'http://127.0.0.1:8767/media/0123456789abcdef0123456789abcdef/clip_00.mp4'}]});
 throw Error('Unexpected '+u);
};
const context={document:{getElementById:id=>nodes[id]},fetch:fakeFetch,console,Audio:class{},URL:{},setTimeout(fn){fn();return 0},clearTimeout(){},window:{rfNarrationFile:null,rfApplyRealAutoCutClips:async clips=>{imported=clips;return clips.length},rfYTReset(){}}};
vm.runInNewContext(fs.readFileSync('smart-autocut.js','utf8'),context);
await nodes.rfAutoCutReal.run();
assert.equal(frameCalls,2);assert.equal(imported.length,1);assert.match(nodes.rfYTStatus.textContent,/کلیپ واقعی/);
console.log('PASS 0939 Vecteezy: mock API search + secure download authorization + verified frame to FFmpeg timeline');
