'use strict';
// Windows-only proof-of-concept Adobe After Effects automation. Bound to localhost.
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process'),crypto=require('crypto');
// 0806: never generate large working files or final videos inside the GitHub project.
// Both directories live in the current Windows user's home folder.
const root=__dirname,port=18819;
const dataRoot=path.join(os.homedir(),'RushFinder-Cache');
const work=path.join(dataRoot,'ae-jobs');
const exportDir=path.join(os.homedir(),'RushFinder-Exports');
const template=path.join(root,'ae-original','خبر فوری 2(1).aep');
fs.mkdirSync(work,{recursive:true});
fs.mkdirSync(exportDir,{recursive:true});
const jobs=new Map();
function respond(res,n,x){res.writeHead(n,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(x))}
function aeExe(){const roots=[process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean);for(const p of roots){const d=path.join(p,'Adobe');if(!fs.existsSync(d))continue;for(const dir of fs.readdirSync(d).filter(s=>s.startsWith('Adobe After Effects')).sort().reverse()){const f=path.join(d,dir,'Support Files','AfterFX.exe');if(fs.existsSync(f))return f}}return null}
function jsxString(s){return JSON.stringify(s.replace(/\\/g,'/'))}
function scriptFor(job){
// Runs on the *installed* After Effects engine; never paints a substitute plate.
// Ensure the three linked images exist under exactly the names embedded in the AEP.
const requiredAssets=['ت2گ copy.png','تگ copy.png','Micropho4.png'];
const missingAssets=requiredAssets.filter(name=>!fs.existsSync(path.join(root,'ae-original',name)));
if(missingAssets.length)throw Error('Missing original After Effects images: '+missingAssets.join(', '));
const assetFiles=requiredAssets.map(name=>path.join(root,'ae-original',name).replace(/\\/g,'/'));
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
// Only replace the reporter text in the ORIGINAL AEP. Never edit @AkhbareFori or graphic layers.
var picked=null;
for(var t=0;t<textEntries.length;t++){
 try{
  var sample=String(textEntries[t].layer.property('ADBE Text Properties').property('ADBE Text Document').value.text||'');
  writeLog('Found text layer '+textEntries[t].comp.name+'/'+textEntries[t].layer.name+' = '+sample.substring(0,120));
  if(sample.indexOf('گزارش')>=0&&sample.indexOf('@')<0){picked=textEntries[t];break;}
 }catch(ignore){}
}
if(!picked)throw Error('Reporter text layer not found in original AEP; refused to change another layer.');
var textLayer=picked.layer;var textComp=picked.comp;
var reporterLocked=textLayer.locked;
if(reporterLocked)textLayer.locked=false;
writeLog('Editing original reporter text layer: '+textLayer.name+' | comp: '+textComp.name);
var textProp=textLayer.property('ADBE Text Properties').property('ADBE Text Document');
if(textProp.numKeys>0){for(var key=1;key<=textProp.numKeys;key++){var kd=textProp.keyValue(key);kd.text=${jsxString(job.name)};textProp.setValueAtKey(key,kd);}}else{var td=textProp.value;td.text=${jsxString(job.name)};textProp.setValue(td);}
// Do not assign renderQueue.rendering: read-only property in ExtendScript.
var textRect=textLayer.sourceRectAtTime(0,false);writeLog('Text width after update: '+textRect.width);
var assets=${JSON.stringify(assetFiles)};
for(var a=1;a<=app.project.numItems;a++){
 var foot=app.project.item(a);
 try{
  if(!(foot instanceof FootageItem)||!(foot.mainSource instanceof FileSource))continue;
  // Always relink known original graphics to the delivered package, not paths
  // from the machine on which the template AEP was authored.
  for(var k=0;k<assets.length;k++){
   var candidate=new File(assets[k]);
   if(candidate.name===foot.name){
    if(!candidate.exists)throw Error('Missing source image '+candidate.fsName);
    foot.replace(candidate);
    writeLog('Original graphics linked: '+foot.name+' -> '+candidate.fsName);
    break;
   }
  }
 }catch(relinkError){writeLog('Relink warning '+foot.name+': '+relinkError.toString());}
}
// Prevent incomplete videos: all three original PNG sources must resolve.
var missingFootage=[];
for(var check=1;check<=app.project.numItems;check++){
 var footage=app.project.item(check);
 try{
  if(!(footage instanceof FootageItem)||!(footage.mainSource instanceof FileSource))continue;
  if(!/\\.png$/i.test(footage.name))continue;
  if(!footage.file||!footage.file.exists)missingFootage.push(footage.name);
 }catch(checkProblem){writeLog('Asset validation warning: '+checkProblem.toString());}
}
if(missingFootage.length)throw Error('AEP required PNG footage could not be relinked: '+missingFootage.join(', '));
writeLog('All referenced original PNG graphics found. Reporter text updated; logo remains unchanged.');
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
if(reporterLocked)textLayer.locked=true;
// Save an EDITABLE copy with the text change and relinked original graphics.
// The source template is never overwritten; the saved AEP stays alongside the final MP4.
try{
 var editedProject=new File(${jsxString(path.join(exportDir,'RushFinder-Edited-'+job.id+'.aep'))});
 app.project.save(editedProject);
 writeLog('Saved editable AEP: '+editedProject.fsName);
}catch(saveError){writeLog('Warning: editable AEP copy could not be saved: '+saveError.toString());}
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
function report(){return {afterEffects:!!aeExe(),afterEffectsPath:aeExe()||'',ffmpeg:!!ffmpegExe(),ffmpegPath:ffmpegExe()||'',project:fs.existsSync(template),templateName:path.basename(template),assetsReady:['ت2گ copy.png','تگ copy.png','Micropho4.png'].every(name=>fs.existsSync(path.join(root,'ae-original',name))),local:true,version:"0806",outputFolder:exportDir,tempFolder:work,installRoot:root.replace(/\\/g,'/')}}
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
// 0806: The AE composition contains large transparent margins around the
// actual lower third. Detect the visible alpha region from settled frames,
// crop those margins, and scale the real artwork with its native aspect ratio.
// 0806: Crop against the complete alpha-animation envelope, not only its middle.
// The AEP lower third contains separate moving text, divider, and logo layers.
// Middle-only crops clipped the later animated layers, making the logo appear alone.
function detectVisibleTag(ff,mov){
 return new Promise((resolve,reject)=>{
  const cmd=['-hide_banner','-i',mov,'-vf','fps=12,format=rgba,alphaextract,cropdetect=limit=0.065:round=2:reset=1','-an','-f','null','-'];
  let log='';
  const probe=cp.spawn(ff,cmd,{windowsHide:true});
  probe.stderr.on('data',b=>{log+=b.toString();if(log.length>6000000)log=log.slice(-6000000);});
  probe.on('error',e=>reject(Error('Cannot measure tag alpha: '+e.message)));
  probe.on('close',code=>{
   if(code!==0){reject(Error('Failed to inspect transparent tag: '+log.slice(-500)));return;}
   const size=/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/.exec(log);
   if(!size){reject(Error('Transparent tag dimensions could not be read.'));return;}
   const srcW=Number(size[1]),srcH=Number(size[2]);
   const boxes=[];
   const re=/x1:(\d+)\s+x2:(\d+)\s+y1:(\d+)\s+y2:(\d+)[^\r\n]*?\bt:([\d.]+)/g;
   let match;
   while((match=re.exec(log))){
    const x1=Number(match[1]),x2=Number(match[2]),y1=Number(match[3]),y2=Number(match[4]);
    if(x2>x1+15&&y2>y1+6&&x1>=0&&y1>=0&&x2<srcW&&y2<srcH){
      boxes.push({x1,x2,y1,y2});
    }
   }
   if(!boxes.length){reject(Error('No visible alpha region found in the After Effects render.'));return;}
   // Use EVERY visible frame, including animated entrance and exit.
   // A fixed crop makes all animation frames share the same coordinates.
   const minX=Math.min(...boxes.map(b=>b.x1)),maxX=Math.max(...boxes.map(b=>b.x2));
   const minY=Math.min(...boxes.map(b=>b.y1)),maxY=Math.max(...boxes.map(b=>b.y2));
   const padX=Math.max(10,Math.ceil((maxX-minX+1)*0.025));
   const padY=Math.max(6,Math.ceil((maxY-minY+1)*0.065));
   const x=Math.max(0,Math.floor((minX-padX)/2)*2);
   const y=Math.max(0,Math.floor((minY-padY)/2)*2);
   const right=Math.min(srcW,Math.ceil((maxX+1+padX)/2)*2);
   const bottom=Math.min(srcH,Math.ceil((maxY+1+padY)/2)*2);
   const w=right-x,h=bottom-y;
   if(w<50||h<18||w>srcW||h>srcH){reject(Error('Invalid tag crop: '+[x,y,w,h].join(',')));return;}
   resolve({x,y,w,h,frames:boxes.length,source:[srcW,srcH]});
  });
 });
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
  // Crop away transparent composition space before fitting the visible lower third.
  // A proportionate 38% lower-third width is used; never distort X/Y separately.
  job.message='مرحله ۳/۳: اندازه‌گیری محدوده واقعی تگ و ساخت MP4...';
  detectVisibleTag(ff,mov).then(crop=>{
   const tagFilter='[1:v]format=rgba,crop='+crop.w+':'+crop.h+':'+crop.x+':'+crop.y+',setsar=1[tag-src];[tag-src][0:v]scale2ref=w=trunc(main_w*0.38/2)*2:h=-2:flags=lanczos[tag][base];[base][tag]overlay=W-w-W*0.024:H-h-H*0.075:shortest=0:format=auto,format=yuv420p[v]';
   fs.appendFileSync(path.join(job.folder,'ae-render.log'),'0806 full-animation alpha-crop '+JSON.stringify(crop)+'\\n');
  const out=path.join(exportDir,job.id+'.mp4');const args=['-hide_banner','-y','-i',job.input,'-i',mov,'-filter_complex',tagFilter,'-map','[v]','-map','0:a?','-c:v','libx264','-preset','medium','-crf','18','-c:a','aac','-movflags','+faststart',out];
  const c2=cp.spawn(ff,args,{windowsHide:true});let err2='';c2.stderr.on('data',x=>err2=(err2+x.toString()).slice(-9000));c2.on('error',reject);c2.on('close',n=>{
   if(n===0&&fs.existsSync(out)&&fs.statSync(out).size>1000){
     job.state='done';job.message='MP4 در پوشه RushFinder-Exports ذخیره شد.';
     // Successful renders no longer accumulate multi-gigabyte alpha frames/MOVs.
     // On failure, leave the temporary files for troubleshooting.
     fs.rm(job.folder,{recursive:true,force:true,maxRetries:4,retryDelay:1000},err=>{
       if(err)console.warn('Temporary render cleanup failed:',err.message);
     });
     resolve();
   }
   else reject(Error('خطای ترکیب MP4: '+err2.slice(-1600)))
  })
  }).catch(reject);
 })
})}

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webm':'video/webm','.mp4':'video/mp4','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
// 0800: the public website can talk only to this local engine, on the same Windows PC.
// Explicitly allow the official hosted site; do not expose the rendering API to arbitrary sites.
const trustedWebOrigins=new Set([
 'https://rushfinder.vercel.app',
 'http://127.0.0.1:18819',
 'http://localhost:18819'
]);
const trustedHostnames=new Set(['127.0.0.1:18819','localhost:18819']);
http.createServer((req,res)=>{
 if(!trustedHostnames.has(req.headers.host))return respond(res,403,{error:'Host not allowed'});
 let u;try{u=new URL(req.url,'http://127.0.0.1')}catch{return respond(res,400,{error:'Invalid URL'})}
 // The primary application entry is index.html (also available at /).
 if(u.pathname==='/')u.pathname='/index.html';
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
const name=(u.searchParams.get('name')||'').trim();if(!name||name.length>140)return respond(res,400,{error:'نام باید بین یک تا ۱۴۰ حرف باشد.'});if(!aeExe()||!ffmpegExe()||!fs.existsSync(template)||!['ت2گ copy.png','تگ copy.png','Micropho4.png'].every(n=>fs.existsSync(path.join(root,'ae-original',n))))return respond(res,503,{error:'پیش‌نیاز ناقص: '+(!aeExe()?'After Effects ':'')+(!ffmpegExe()?'FFmpeg ':'')+(!fs.existsSync(template)?'AEP ':'')+(!['ت2گ copy.png','تگ copy.png','Micropho4.png'].every(n=>fs.existsSync(path.join(root,'ae-original',n)))?'PNG original assets ':'')});const id=crypto.randomUUID(),folder=path.join(work,id);fs.mkdirSync(folder,{recursive:true});const job={id,folder,name,input:path.join(folder,'source-video'+(path.extname(u.searchParams.get('filename')||'').toLowerCase().match(/^\.(mp4|mov|webm|m4v|avi)$/)?.[0]||'.mp4')),state:'uploading',message:'دریافت فیلم...'};jobs.set(id,job);let total=0;const f=fs.createWriteStream(job.input);req.on('data',c=>{total+=c.length;if(total>1024*1024*1024){req.destroy();f.destroy()}});req.pipe(f);f.on('finish',()=>{job.state='queued';job.message='در صف رندر...';respond(res,200,{id});run(job)});req.on('error',()=>{job.state='error';job.message='آپلود فیلم متوقف شد.'});return;}
if(u.pathname==='/ae-api/status'){const j=jobs.get(u.searchParams.get('id'));if(!j)return respond(res,200,{state:'error',message:'پردازش پیدا نشد.'});return respond(res,200,{id:j.id,state:j.state,message:j.message});}
let file;try{if(u.pathname.startsWith('/ae-output/')){const id=path.basename(u.pathname,'.mp4');if(!/^[a-f0-9-]{36}$/.test(id))throw Error();file=path.join(exportDir,id+'.mp4')}else{if(u.pathname.startsWith('/ae-jobs')||u.pathname.startsWith('/ae-original')||u.pathname.startsWith('/tools/'))throw Error();file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))throw Error()}}catch{return respond(res,403,{error:'Forbidden'})}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.stat(file,(err,s)=>{if(err||!s.isFile()){res.writeHead(404);res.end('Not found');return}let start=0,end=s.size-1,code=200,headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};if(req.headers.range){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range);if(m){start=Number(m[1]);end=m[2]?Number(m[2]):end;if(start>end||start>=s.size){res.writeHead(416);res.end();return}code=206;headers['Content-Range']=`bytes ${start}-${end}/${s.size}`}}headers['Content-Length']=end-start+1;res.writeHead(code,headers);fs.createReadStream(file,{start,end}).pipe(res)})
}).listen(port,'127.0.0.1',()=>console.log('RushFinder 0806: http://127.0.0.1:'+port+'/index.html'));
