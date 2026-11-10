import assert from 'node:assert/strict';
import handler from '../api/avalai-image.js';
process.env.AVALAI_API_KEY='test-private-key';
process.env.RF_INFO_ACCESS_CODE='test-code';
const originalFetch=globalThis.fetch;
let calls=[];
const imgBytes=Buffer.from([137,80,78,71,13,10,26,10,...Array(180).fill(1)]);
globalThis.fetch=async(url,opts)=>{
 calls.push({url:String(url),method:opts.method});
 assert.equal(opts.method,'GET');
 return new Response(imgBytes,{status:200,headers:{'content-type':'image/png','content-length':String(imgBytes.length)}});
};
function res(){return {headers:{},statusCode:0,body:null,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(x){this.body=x;return this;},send(x){this.body=x;return this;}}}
async function get(query){const r=res();await handler({method:'GET',query,headers:{'x-rushfinder-info-code':'test-code'}},r);return r;}
const good=await get({recover:'image',url:'https://image-proxy-worker.gnbellosc.workers.dev/example.png?signature=123'});
assert.equal(good.statusCode,200);assert.equal(good.headers['Content-Type'],'image/png');assert.equal(calls.length,1);
for(const host of ['evil.example','localhost','image-proxy-worker.gnbellosc.workers.dev.evil.com']){
 const r=await get({recover:'image',url:'https://'+host+'/fake.png'});
 assert.equal(r.statusCode,400);assert.equal(calls.length,1);
}
const noPaid=calls.every(x=>x.method==='GET'&&!x.url.includes('/images/generations'));
assert.ok(noPaid);
console.log('PASS: expected worker host permitted; arbitrary hosts blocked; GET only; no paid generation call.');
globalThis.fetch=originalFetch;
