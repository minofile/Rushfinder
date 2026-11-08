import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
process.env.GEMINI_API_KEY='test-not-real';
let apiHits=0;
globalThis.fetch=async(url,options={})=>{
 if(String(url).includes('aparat.com'))return {ok:true,status:200,json:async()=>({videobysearch:[{uid:'ax12BC',title:'سیل در تهران',duration:85,description:'نمایی از سیل',small_poster:'https://example.com/1.jpg'}]})};
 apiHits++;
 const request=JSON.parse(options.body);
 assert.equal(request.contents[0].parts.length,7); // prompt + 3 frame captions + 3 inline images
 return {ok:true,status:200,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({matches:[{start:1,end:7,confidence:.93,visualEvidence:'water covering the street near the vehicles'}]})}]}}]})};
};
const {default:handler}=await import(pathToFileURL(path.resolve('api/youtube-music.js')).href);
function response(){return {code:0,body:null,setHeader(){},status(c){this.code=c;return this},json(o){this.body=o;return this}}}
let r=response();await handler({method:'GET',query:{mode:'smartedit-aparat',q:'تهران'}} ,r);
assert.equal(r.code,200);assert.equal(r.body.items[0].provider,'aparat');assert.equal(r.body.items[0].id,'ax12BC');
r=response();await handler({method:'POST',query:{mode:'smartedit-frames'},body:{text:'سیل در تهران',seconds:6,frames:[1,2,3].map(time=>({time,data:Buffer.alloc(100,15).toString('base64')}))}},r);
assert.equal(r.code,200);assert.equal(r.body.method,'gemini_aparat_frames');assert.equal(r.body.matches[0].start,1);
assert.equal(apiHits,1);
console.log('PASS Aparat discovery + Gemini actual frame input');
