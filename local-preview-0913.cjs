'use strict';
// Local-only preview, with the SAME API handlers as the Vercel deployment.
// Binds exclusively to loopback and does not upload personal media.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.woff2':'font/woff2','.ttf':'font/ttf','.wasm':'application/wasm'};
const api={'/api/smart-stock':require('./api/smart-stock.js'),'/api/smart-download':require('./api/smart-download.js')};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(api[url.pathname]){
    res.status=function(code){this.statusCode=code;return this};
    res.json=function(data){if(!this.writableEnded){this.setHeader('Content-Type','application/json; charset=utf-8');this.end(JSON.stringify(data))}return this};
    req.query=Object.fromEntries(url.searchParams);
    await api[url.pathname](req,res);return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return}
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.stat(target,(error,st)=>{
    if(error||!st.isFile()){res.writeHead(404).end('Not found');return}
    res.setHeader('Content-Type',mime[path.extname(target).toLowerCase()]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method==='HEAD'){res.end();return}
    fs.createReadStream(target).pipe(res);
  });
 }catch(e){console.error('Local preview error:',e);if(!res.headersSent){res.writeHead(500).end('Local preview failed')}else res.end()}
});
server.listen(0,'127.0.0.1',()=>{
 const url='http://127.0.0.1:'+server.address().port+'/index.html#smart-edit';
 console.log('RushFinder SmartEdit 0913 local preview:',url);
 if(process.platform==='win32')require('node:child_process').exec('start "" "'+url+'"');
});
