'use strict';
// Windows-only proof-of-concept Adobe After Effects automation. Bound to localhost.
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process'),crypto=require('crypto');
const root=__dirname,port=18813,work=path.join(root,'ae-jobs'),template=path.join(root,'ae-original','tag1-source.aep');fs.mkdirSync(work,{recursive:true});
const jobs=new Map();
function respond(res,n,x){res.writeHead(n,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(x))}
function aeExe(){const roots=[process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean);for(const p of roots){const d=path.join(p,'Adobe');if(!fs.existsSync(d))continue;for(const dir of fs.readdirSync(d).filter(s=>s.startsWith('Adobe After Effects')).sort().reverse()){const f=path.join(d,dir,'Support Files','AfterFX.exe');if(fs.existsSync(f))return f}}return null}
function jsxString(s){return JSON.stringify(s.replace(/\\/g,'/'))}
function scriptFor(job){
// Runs on the *installed* After Effects engine; never paints a substitute plate.
const assetFiles=fs.readdirSync(path.join(root,'ae-original')).filter(x=>x.toLowerCase().endsWith('.png')).map(x=>path.join(root,'ae-original',x).replace(/\\/g,'/'));
const script=`(function(){
var folder=${jsxString(job.folder)};var framesFolder=new Folder(folder+'/alpha-frames');if(!framesFolder.exists)framesFolder.create();var result=new File(folder+'/render.done');var error=new File(folder+'/render.error');var log=new File(folder+'/ae-render.log');
function writeLog(s){try{log.open('a');log.writeln(new Date().toString()+' | '+s);log.close();}catch(ignore){}}
function safe(v,d){return (v===undefined||v===null)?d:v;}
try{
app.beginSuppressDialogs();writeLog('Starting original project');
app.open(new File(${jsxString(template)}));
var comp=null;for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);if(it instanceof CompItem&&it.name.toLowerCase().indexOf('tag1')>=0){comp=it;break;}}
if(!comp){for(var i=1;i<=app.project.numItems;i++){var c=app.project.item(i);if(c instanceof CompItem && c.numLayers>0 && (!comp || c.numLayers>comp.numLayers))comp=c;}writeLog('tag1 not named in new AEP; fallback comp '+(comp?comp.name:'none'));}if(!comp)throw Error('No composition found in uploaded AEP');writeLog('Comp: '+comp.name);
var visited={};var textEntries=[];
function collectText(c){if(!c||visited[c.id])return;visited[c.id]=true;for(var j=1;j<=c.numLayers;j++){var lyr=c.layer(j);try{if(lyr.property('ADBE Text Properties')&&lyr.property('ADBE Text Properties').property('ADBE Text Document'))textEntries.push({layer:lyr,comp:c});}catch(ignore){}try{if(lyr.source instanceof CompItem)collectText(lyr.source);}catch(ignore){}}}
collectText(comp);if(!textEntries.length)throw Error('Editable text layer not found in tag1');
function scoreText(entry){var score=0;try{var td=entry.layer.property('ADBE Text Properties').property('ADBE Text Document').value;var txt=String(td.text||'');if(txt.indexOf('گزارش')>=0)score+=100;if(txt.indexOf('@')>=0)score-=80;if(/[اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]/.test(txt))score+=30;score+=Math.min(txt.length,40);}catch(ignore){}return score;}
var picked=textEntries[0],best=-9999;for(var t=0;t<textEntries.length;t++){var sc=scoreText(textEntries[t]);if(sc>best){best=sc;picked=textEntries[t];}}
var textLayer=picked.layer;var textComp=picked.comp;writeLog('Text layer: '+textLayer.name+' | comp: '+textComp.name);
var textProp=textLayer.property('ADBE Text Properties').property('ADBE Text Document');
if(textProp.numKeys>0){for(var key=1;key<=textProp.numKeys;key++){var kd=textProp.keyValue(key);kd.text=${jsxString(job.name)};textProp.setValueAtKey(key,kd);}}else{var td=textProp.value;td.text=${jsxString(job.name)};textProp.setValue(td);}
// Do not assign renderQueue.rendering: read-only property in ExtendScript.
var textRect=textLayer.sourceRectAtTime(0,false);writeLog('Text width after update: '+textRect.width);
var assets=${JSON.stringify(assetFiles)};
for(var a=1;a<=app.project.numItems;a++){var foot=app.project.item(a);try{if(!(foot instanceof FootageItem)||!(foot.mainSource instanceof FileSource))continue;if(foot.file&&foot.file.exists)continue;
 for(var k=0;k<assets.length;k++){var candidate=new File(assets[k]);if(candidate.name===foot.name){foot.replace(candidate);writeLog('Relinked '+foot.name);break;}}
}catch(ignore){writeLog('Relink check warning '+ignore.toString());}}
// 0775: Keep the original white plate fixed; center the name in that plate.
// Position relative to the existing right-hand separator instead of moving the logo.
try{
 var targetT=Math.min(Math.max(0,textComp.duration*0.45),Math.max(0,textComp.duration-0.01));
 // The original plate is fixed. Never set animated/locked transform properties.
 // AE's paragraph alignment can be adjusted safely without changing layer anchors.
 var count=Math.max(1,textProp.numKeys);
 for(var ai=1;ai<=count;ai++){
  var d=textProp.numKeys?textProp.keyValue(ai):textProp.value;
  d.justification=ParagraphJustification.CENTER_JUSTIFY;
  if(textProp.numKeys)textProp.setValueAtKey(ai,d);else textProp.setValue(d);
 }
 // Keep an inner margin on BOTH sides of the fixed white name plate.
 // Source comp coordinates: fit the actual rendered text into ~218px, not right against separator.
 try{
   var safeWidth=218;
   var fontKeys=Math.max(1,textProp.numKeys);
   var checkTime=Math.min(Math.max(0,textComp.duration*0.45),Math.max(0,textComp.duration-0.01));
   var originalWidth=textLayer.sourceRectAtTime(checkTime,false).width;
   if(originalWidth>safeWidth){
     var fittedRatio=safeWidth/originalWidth;
     for(var fi=1;fi<=fontKeys;fi++){
       var fontDoc=textProp.numKeys?textProp.keyValue(fi):textProp.value;
       // Preserve typography; never shrink below ~82% unless the template itself requires it.
       var fittedSize=Math.max(26,Math.round(fontDoc.fontSize*Math.max(0.82,fittedRatio)));
       fontDoc.fontSize=fittedSize;
       if(textProp.numKeys)textProp.setValueAtKey(fi,fontDoc);else textProp.setValue(fontDoc);
     }
   }
   writeLog('0782 text inner padding: width before='+originalWidth+' after='+textLayer.sourceRectAtTime(checkTime,false).width);
 }catch(fitError){writeLog('0782 padding warning: '+fitError.toString());}
 // Place the text layer center over the fixed white name plate, not the divider.
 // Preserve all animated Y values and shift X in every existing position keyframe.
 // This AEP places the name text origin immediately beside the divider;
 // its white plate center is approximately 165 source-comp pixels to the left.
 var horizontalCorrection=-215;
 var tf=textLayer.property('ADBE Transform Group');
 var positionProp=tf && tf.property('ADBE Position');
 if(!positionProp)throw Error('Name text Position not found');
 var wasLocked=textLayer.locked;
 if(wasLocked)textLayer.locked=false;
 try{
   var sep=positionProp.dimensionsSeparated;
   if(sep){
     var px=positionProp.getSeparationFollower(0);
     if(px.numKeys>0){for(var ki=1;ki<=px.numKeys;ki++)px.setValueAtKey(ki,px.keyValue(ki)+horizontalCorrection);}
     else px.setValue(px.value+horizontalCorrection);
   }else if(positionProp.numKeys>0){
     for(var ki=1;ki<=positionProp.numKeys;ki++){
       var pv=positionProp.keyValue(ki);
       if(pv.length>2)positionProp.setValueAtKey(ki,[pv[0]+horizontalCorrection,pv[1],pv[2]]);
       else positionProp.setValueAtKey(ki,[pv[0]+horizontalCorrection,pv[1]]);
     }
   }else{
     var pv=positionProp.value;
     if(pv.length>2)positionProp.setValue([pv[0]+horizontalCorrection,pv[1],pv[2]]);
     else positionProp.setValue([pv[0]+horizontalCorrection,pv[1]]);
   }
 }finally{if(wasLocked)textLayer.locked=true;}
 writeLog('0783: Optical centering of the fixed name plate; shifted X '+horizontalCorrection+' px left to fixed white plate center.');
}catch(e){writeLog('0777 centering warning '+e.toString());}
// 0768: keep original graphic layers and masks unchanged; adjust only editable text box.
try{
 var widthBefore=textLayer.sourceRectAtTime(0,false).width;
 writeLog('Original reporter text width: '+widthBefore);
 // Any Adobe-specific expression controlling plate size remains in the original project.
 // This runner does not add or replace the actual white plate.
}catch(e){writeLog('Text measurement warning '+e.toString());}
for(var q=app.project.renderQueue.numItems;q>=1;q--)app.project.renderQueue.item(q).remove();
var rq=app.project.renderQueue.items.add(comp);var om=rq.outputModule(1);
// Output Module settings such as Format/Channels/Color may be read-only.
// Apply an installed Alpha template; never try to write read-only settings.
var templates=om.templates;writeLog('Available output templates: '+templates.join(' | '));
var candidates=[];for(var z=0;z<templates.length;z++)if(templates[z]==='Lossless with Alpha')candidates.push(templates[z]);
for(var z=0;z<templates.length;z++)if(/alpha/i.test(templates[z])&&candidates.join('|').indexOf(templates[z])<0)candidates.push(templates[z]);
if(!candidates.length)throw Error('No Alpha output template is installed. Available: '+templates.join(', '));
var masterReady=false, lastFailure='';
for(var attempt=0;attempt<candidates.length;attempt++){
 try{
  om.applyTemplate(candidates[attempt]);writeLog('Trying template '+candidates[attempt]);
  var st=om.getSettings(GetSettingsFormat.STRING);var fmt=String(st['Format']||'');writeLog('Output format='+fmt+' channels='+st['Channels']);
  var seq=/png|sequence|tiff|targa|exr/i.test(fmt);var ext=seq?'.png':(/quicktime|mov/i.test(fmt)?'.mov':'.avi');
  var target=seq?(framesFolder.fsName+'/tag-[#####]'+ext):(folder+'/tag-alpha-source'+ext);
  om.file=new File(target);writeLog('Rendering alpha master to '+target);
  app.project.renderQueue.render();writeLog('Render queue finished, status='+rq.status+' DONE='+RQItemStatus.DONE);
  if(seq){var frameFiles=framesFolder.getFiles(function(f){return f instanceof File&&/\.png$/i.test(f.name);});if(frameFiles.length>2){writeLog('PNG frames created '+frameFiles.length);masterReady=true;break;}}
  else{var rendered=om.file;if(rendered.exists&&rendered.length>1000){writeLog('Alpha movie created '+rendered.length);masterReady=true;break;}}
  lastFailure='No actual output produced; render status='+rq.status;writeLog('Attempt failed: '+lastFailure);
 }catch(renderProblem){lastFailure=renderProblem.toString();writeLog('Attempt exception: '+lastFailure);}
}
if(!masterReady)throw Error('After Effects produced no Alpha master. Last reason: '+lastFailure+'; check AE Render Queue log, missing effects, or output codec.');
result.open('w');result.write('ok');result.close();writeLog('Completed: transparent master verified');
}catch(e){writeLog('ERROR '+e.toString());error.open('w');error.write(e.toString());error.close();}finally{
 try{app.endSuppressDialogs(false)}catch(ignore){}
 // Close only the current project; leave the running After Effects application alive.
 // The user need not manually close the window before the next job.
 try{writeLog('Closing the After Effects worker automatically');
   if(app.project)app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
 }catch(closeError){writeLog('Project close: '+closeError.toString());}
 writeLog('AE remains running for the next reporter video; no app.quit called.');
}
})();`;
const f=path.join(job.folder,'run.jsx');fs.writeFileSync(f,'\uFEFF'+script,'utf8');return f}

function ffmpegExe(){for(const f of [path.join(root,'tools','ffmpeg.exe'),path.join(process.env.LOCALAPPDATA||'', 'RushFinder','tools','ffmpeg.exe'),path.join(root,'ffmpeg.exe'),path.join(process.env.LOCALAPPDATA||'', 'Microsoft','WinGet','Links','ffmpeg.exe'),'ffmpeg']){try{const r=cp.spawnSync(f,['-version'],{windowsHide:true,timeout:5000});if(r.status===0)return f}catch(e){}}return null}
function report(){return {afterEffects:!!aeExe(),afterEffectsPath:aeExe()||'',ffmpeg:!!ffmpegExe(),ffmpegPath:ffmpegExe()||'',project:fs.existsSync(template),local:true,version:"0799",installRoot:root.replace(/\\/g,'/')}}
function runActive(job){const fail=e=>{job.state='error';let tail='';try{const f=path.join(job.folder,'ae-render.log');if(fs.existsSync(f))tail=fs.readFileSync(f,'utf8').split(/\r?\n/).filter(Boolean).slice(-10).join('\n').slice(-2500);}catch(ignore){}job.message=String(e)+(tail?'\nآخرین گزارش واقعی افتر افکت:\n'+tail:'\nگزارش افتر افکت هنوز ایجاد نشده است.');};(async()=>{try{job.state='rendering';job.message='مرحله ۱/۳: تغییر متن در پروژه AEP و رندر آلفای اصلی After Effects...';const exe=aeExe();if(!exe)throw Error('After Effects در Program Files/Adobe پیدا نشد.');if(!ffmpegExe())throw Error('FFmpeg پیدا نشد. فایل ffmpeg.exe مخصوص ویندوز را در پوشه tools کنار سایت قرار بدهید، یا FFmpeg را در PATH نصب کنید.');const script=scriptFor(job);job.message='مرحله ۱/۳: درخواست اجرای اسکریپت به After Effects فرستاده شد.';// Launch AE directly as in the last functioning releases. PowerShell Start-Process
 // occasionally loses the JSX -r argument and prevents script startup.
 const proc=cp.spawn(exe,['-r',script],{cwd:job.folder,windowsHide:true,detached:false,stdio:'ignore'});
 // Use native AE -r invocation. No process-wide taskkill/minimizer is used.
 proc.on('error',fail);proc.on('exit',(code)=>{if(code!==0&&job.state==='rendering'&&!fs.existsSync(path.join(job.folder,'ae-render.log')))job.message='راه‌اندازی موتور با کد '+code+' پایان یافت؛ در حال بررسی گزارش افتر افکت...';});let elapsed=0;const timer=setInterval(()=>{
  elapsed+=2;
  if(job.state==='error'){clearInterval(timer);return}
  const errorPath=path.join(job.folder,'render.error'), donePath=path.join(job.folder,'render.done'), logPath=path.join(job.folder,'ae-render.log');
  if(fs.existsSync(errorPath)){clearInterval(timer);fail(fs.readFileSync(errorPath,'utf8'));return}
  if(fs.existsSync(donePath)){clearInterval(timer);blend(job).catch(fail);return}
  let message='مرحله ۱/۳: اجرای پروژه اصلی After Effects';
  message+=' | زمان سپری‌شده: '+Math.floor(elapsed/60)+' دقیقه و '+(elapsed%60)+' ثانیه';
  if(fs.existsSync(logPath)){
    try{const lines=fs.readFileSync(logPath,'utf8').split(/\r?\n/).filter(Boolean);if(lines.length)message+='\nآخرین پیام افتر افکت: '+lines[lines.length-1].slice(-280)}catch(e){}
  }else if(elapsed>=30){message+='\nاسکریپت هنوز شروع نشده است. ممکن است After Effects مشغول بازکردن پروژه یا منتظر تأیید باشد.'}
  try{
    const file=fs.readdirSync(job.folder).filter(n=>/^tag-alpha-source\.(mov|avi)$/i.test(n)).map(n=>path.join(job.folder,n)).find(p=>fs.statSync(p).size>0);
    if(file){message+='\nفایل خروجی آلفا: '+(fs.statSync(file).size/1048576).toFixed(1)+' مگابایت';}
  }catch(e){}
  if(elapsed>=90&&!fs.existsSync(logPath)){clearInterval(timer);fail('After Effects فرمان اسکریپت را اجرا نکرد. در نسخه 0778 خطای راه‌اندازی با گزارش ثبت می‌شود. After Effects فرمان جدید را نپذیرفت؛ اجرای خودکار نشست قبلی را بررسی کنید.');return}
  if(elapsed>=300)message+='\n⚠ پنج دقیقه گذشته است؛ اگر اندازه فایل آلفا افزایش نمی‌یابد، پنجره After Effects را بررسی کنید.';
  if(elapsed>=1200){clearInterval(timer);fail('رندر After Effects پس از ۲۰ دقیقه به پایان نرسید. آخرین وضعیت: '+message);return}
  job.message=message;
},2000);
}catch(e){fail(e.message)}})()}

// One Adobe worker at a time: subsequent movies are queued and run automatically.
const pendingAE=[];
let currentAE=null;
function run(job){
  job.state='queued';
  job.message='در صف پردازش؛ پس از خروجی قبلی خودکار شروع می‌شود.';
  pendingAE.push(job);
  scheduleNextAE();
}
function scheduleNextAE(){
  if(currentAE || !pendingAE.length)return;
  const job=pendingAE.shift(); currentAE=job;
  runActive(job);
  const checker=setInterval(()=>{
    if(job.state==='done'||job.state==='error'){
      clearInterval(checker);
      // Give the resident After Effects engine time to release the render queue.
      setTimeout(()=>{currentAE=null;scheduleNextAE();},2500);
    }
  },1000);
}
function blend(job){return new Promise((resolve,reject)=>{
 job.state='converting';job.message='مرحله ۲/۳: تبدیل خروجی آلفای افتر افکت به MOV شفاف ProRes 4444...';
 const frameDir=path.join(job.folder,'alpha-frames');const frames=fs.existsSync(frameDir)?fs.readdirSync(frameDir).filter(n=>/\.png$/i.test(n)).sort():[];const source=fs.readdirSync(job.folder).filter(n=>/^tag-alpha-source\.(mov|avi)$/i.test(n)).map(n=>path.join(job.folder,n)).find(p=>fs.statSync(p).size>1000);const mov=path.join(job.folder,'tag-transparent.mov');
 if(!source && frames.length<3){reject(Error('فایل آلفا یا فریم PNG ساخته نشده؛ ae-render.log را بررسی کنید.'));return}
 const ff=ffmpegExe();const args1=frames.length>=3?['-hide_banner','-y','-framerate','30','-pattern_type','sequence','-i',path.join(frameDir, frames[0].replace(/\d+(?=\.png$)/, m=>'%0'+m.length+'d')),'-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16',mov]:['-hide_banner','-y','-i',source,'-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16',mov];
 const c1=cp.spawn(ff,args1,{windowsHide:true});let err1='';c1.stderr.on('data',x=>err1=(err1+x.toString()).slice(-9000));c1.on('error',reject);
 c1.on('close',code=>{
  if(code!==0||!fs.existsSync(mov)||fs.statSync(mov).size<1000){reject(Error('تبدیل MOV شفاف ناموفق: '+err1.slice(-1600)));return}
  // The MP4 is composed only after an actual transparent MOV exists.
  job.state='combining';job.message='مرحله ۳/۳: ترکیب MOV شفاف با فیلم و ساخت MP4...';
  // 0798: size the full transparent AE composition against the INPUT video width.
  // A fixed percentage of AE's source dimensions used to make the lower-third
  // disproportionately large on smaller videos. 60% of final video width for
  // the comp ensures a compact, consistent tag across input resolutions.
  // Right-anchor with a small safe margin; retain original AE animation/alpha.
  const tagFilter='[1:v]format=rgba[tag-src];[tag-src][0:v]scale2ref=w=trunc(main_w*0.60/2)*2:h=-2:flags=lanczos[tag][base];[base][tag]overlay=W-w-W*0.015:H-h+H*0.035:shortest=0:format=auto,format=yuv420p[v]';
  const out=path.join(work,job.id+'.mp4');const args=['-hide_banner','-y','-i',job.input,'-i',mov,'-filter_complex',tagFilter,'-map','[v]','-map','0:a?','-c:v','libx264','-preset','medium','-crf','18','-c:a','aac','-movflags','+faststart',out];
  const c2=cp.spawn(ff,args,{windowsHide:true});let err2='';c2.stderr.on('data',x=>err2=(err2+x.toString()).slice(-9000));c2.on('error',reject);c2.on('close',n=>{
   if(n===0&&fs.existsSync(out)&&fs.statSync(out).size>1000){job.state='done';job.message='MP4 ساخته شد؛ متن از لایه اصلی افتر افکت رندر شده است.';resolve()}
   else reject(Error('خطای ترکیب MP4: '+err2.slice(-1600)))
  })
 })
})}

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webm':'video/webm','.mp4':'video/mp4','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
// 0799: the public website can talk only to this local engine, on the same Windows PC.
// Explicitly allow the official hosted site; do not expose the rendering API to arbitrary sites.
const trustedWebOrigins=new Set([
 'https://rushfinder.vercel.app',
 'http://127.0.0.1:18813',
 'http://localhost:18813'
]);
const trustedHostnames=new Set(['127.0.0.1:18813','localhost:18813']);
http.createServer((req,res)=>{
 if(!trustedHostnames.has(req.headers.host))return respond(res,403,{error:'Host not allowed'});
 let u;try{u=new URL(req.url,'http://127.0.0.1')}catch{return respond(res,400,{error:'Invalid URL'})}
 if(u.pathname.startsWith('/ae-api/')||u.pathname.startsWith('/ae-output/')){
   const origin=req.headers.origin;
   res.setHeader('Vary','Origin');
   if(origin && !trustedWebOrigins.has(origin))return respond(res,403,{error:'Origin not allowed'});
   if(origin){
     res.setHeader('Access-Control-Allow-Origin',origin);
     res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
     res.setHeader('Access-Control-Allow-Headers','Content-Type');
     res.setHeader('Access-Control-Allow-Private-Network','true');
   }
   if(req.method==='OPTIONS'){
     res.writeHead(204,{'Cache-Control':'no-store','Content-Length':'0'});res.end();return;
   }
 }
 if(u.pathname==='/ae-api/check')return respond(res,200,report());
if(u.pathname==='/ae-api/create' && req.method==='POST'){
const name=(u.searchParams.get('name')||'').trim();if(!name||name.length>140)return respond(res,400,{error:'نام باید بین یک تا ۱۴۰ حرف باشد.'});if(!aeExe()||!ffmpegExe()||!fs.existsSync(template))return respond(res,503,{error:'پیش‌نیاز ناقص: '+(!aeExe()?'After Effects ':'')+(!ffmpegExe()?'FFmpeg ':'')+(!fs.existsSync(template)?'AEP ':'')});const id=crypto.randomUUID(),folder=path.join(work,id);fs.mkdirSync(folder,{recursive:true});const job={id,folder,name,input:path.join(folder,'source-video'+(path.extname(u.searchParams.get('filename')||'').toLowerCase().match(/^\.(mp4|mov|webm|m4v|avi)$/)?.[0]||'.mp4')),state:'uploading',message:'دریافت فیلم...'};jobs.set(id,job);let total=0;const f=fs.createWriteStream(job.input);req.on('data',c=>{total+=c.length;if(total>1024*1024*1024){req.destroy();f.destroy()}});req.pipe(f);f.on('finish',()=>{job.state='queued';job.message='در صف رندر...';respond(res,200,{id});run(job)});req.on('error',()=>{job.state='error';job.message='آپلود فیلم متوقف شد.'});return;}
if(u.pathname==='/ae-api/status'){const j=jobs.get(u.searchParams.get('id'));if(!j)return respond(res,200,{state:'error',message:'پردازش پیدا نشد.'});return respond(res,200,{id:j.id,state:j.state,message:j.message});}
let file;try{if(u.pathname.startsWith('/ae-output/')){const id=path.basename(u.pathname,'.mp4');if(!/^[a-f0-9-]{36}$/.test(id))throw Error();file=path.join(work,id+'.mp4')}else{if(u.pathname.startsWith('/ae-jobs')||u.pathname.startsWith('/ae-original')||u.pathname.startsWith('/tools/'))throw Error();file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))throw Error()}}catch{return respond(res,403,{error:'Forbidden'})}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.stat(file,(err,s)=>{if(err||!s.isFile()){res.writeHead(404);res.end('Not found');return}let start=0,end=s.size-1,code=200,headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};if(req.headers.range){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range);if(m){start=Number(m[1]);end=m[2]?Number(m[2]):end;if(start>end||start>=s.size){res.writeHead(416);res.end();return}code=206;headers['Content-Range']=`bytes ${start}-${end}/${s.size}`}}headers['Content-Length']=end-start+1;res.writeHead(code,headers);fs.createReadStream(file,{start,end}).pipe(res)})
}).listen(port,'127.0.0.1',()=>console.log('RushFinder 0799: http://127.0.0.1:'+port+'/index.html'));
