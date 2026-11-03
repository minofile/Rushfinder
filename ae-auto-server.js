'use strict';
// Windows-only proof-of-concept Adobe After Effects automation. Bound to localhost.
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process'),crypto=require('crypto');
// 0806: never generate large working files or final videos inside the GitHub project.
// Both directories live in the current Windows user's home folder.
const root=__dirname,port=18826;
const dataRoot=path.join(os.homedir(),'RushFinder-Cache');
const work=path.join(dataRoot,'ae-jobs');
const exportDir=path.join(os.homedir(),'RushFinder-Exports');
const template=path.join(root,'ae-original','خبر فوری 2(2).aep');
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
app.beginSuppressDialogs();
try{app.exitAfterLaunchAndEval=true;}catch(ignore){}
writeLog('0809: isolated After Effects worker started; opening ORIGINAL AEP');
var requestedProject=new File(${jsxString(template)});
if(!requestedProject.exists)throw Error('Original AEP not found: '+requestedProject.fsName);
app.open(requestedProject);
if(!app.project||!app.project.file)throw Error('After Effects did not load the AEP');
writeLog('PROJECT_OPENED: '+app.project.file.fsName);
var comp=null;for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);if(it instanceof CompItem&&it.name.toLowerCase().indexOf('tag1')>=0){comp=it;break;}}
if(!comp){var names=[];for(var ci=1;ci<=app.project.numItems;ci++){var c=app.project.item(ci);if(c instanceof CompItem)names.push(c.name);}throw Error('No tag1 composition in supplied AEP. Compositions: '+names.join(' | '));}
writeLog('COMPOSITION_SELECTED: '+comp.name+' | '+comp.width+'x'+comp.height+' duration='+comp.duration);
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
// In some original AEP variants the reporter area is intentionally blank.
 // Try a uniquely named reporter layer, then a uniquely empty text layer.
 if(!picked){
   var named=[];
   for(var ni=0;ni<textEntries.length;ni++){
     var lName=String(textEntries[ni].layer.name||'');
     var tContent=String(textEntries[ni].layer.property('ADBE Text Properties').property('ADBE Text Document').value.text||'');
     if(tContent.indexOf('@')<0 && /خبرنگار|گزارش|reporter|reportername|name field/i.test(lName))named.push(textEntries[ni]);
   }
   if(named.length===1){picked=named[0];writeLog('Selected uniquely named reporter text layer: '+picked.layer.name);}
 }
 if(!picked){
   var empty=[];
   for(var ei=0;ei<textEntries.length;ei++){
     var tx=String(textEntries[ei].layer.property('ADBE Text Properties').property('ADBE Text Document').value.text||'');
     if(!tx.replace(/\\s/g,''))empty.push(textEntries[ei]);
   }
   if(empty.length===1){picked=empty[0];writeLog('Selected unique blank reporter text slot: '+picked.layer.name);}
 }
 if(!picked)throw Error('Reporter text layer is ambiguous: please name it Reporter or خبرنگار in the AEP. No other text has been modified.');
var textLayer=picked.layer;var textComp=picked.comp;
if(!textLayer.enabled)throw Error('Original reporter text layer is disabled in the AEP');
var reporterLocked=textLayer.locked;
if(reporterLocked)textLayer.locked=false;
writeLog('REPORTER_LAYER_SELECTED: '+textLayer.name+' | comp: '+textComp.name);
// 0813: keep every reporter name centered in the ORIGINAL white name plate.
// Record the template's visible text center before replacing its placeholder.
// This center travels correctly with the existing tag animation and parent comps.
var textProp=textLayer.property('ADBE Text Properties').property('ADBE Text Document');
if(textProp.expressionEnabled)throw Error('Reporter Source Text has an expression; cannot guarantee centered custom names.');
var centerAt=Math.max(0,Math.min(textComp.duration*0.5,textComp.duration-1/Math.max(1,textComp.frameRate)));
var originalRect=textLayer.sourceRectAtTime(centerAt,false);
if(!(originalRect.width>1 && originalRect.height>1))throw Error('Reporter placeholder has no visible bounds to locate its white box center.');
var fixedCenterX=originalRect.left+originalRect.width/2;
var fixedCenterY=originalRect.top+originalRect.height/2;
// The original placeholder fits the plate. Use its width as a safe limit
// so longer input can shrink, but NEVER enlarge shorter names.
var maxTextWidth=originalRect.width*1.02;
var initialDoc=textProp.value;
var initialFont=Number(initialDoc.fontSize)||50;
var minimumFont=Math.max(8,initialFont*0.32);
function setReporterText(scale){
 function editDoc(d){
  d.text=${jsxString(job.name)};
  d.justification=ParagraphJustification.CENTER_JUSTIFY;
  if(scale<1)d.fontSize=Number(d.fontSize)*scale;
  return d;
 }
 if(textProp.numKeys>0){
  for(var ki=1;ki<=textProp.numKeys;ki++)
   textProp.setValueAtKey(ki,editDoc(textProp.keyValue(ki)));
 }else textProp.setValue(editDoc(textProp.value));
}
setReporterText(1);
var updatedRect=textLayer.sourceRectAtTime(centerAt,false);
// Only point-text needs a transform compensation. Paragraph/box text is
// already centered by CENTER_JUSTIFY within its existing authored text box.
var isBoxText=!!textProp.value.boxText;
if(!isBoxText){
 for(var shrink=0;shrink<8 && updatedRect.width>maxTextWidth;shrink++){
  var ratio=Math.min(0.96,0.98*maxTextWidth/updatedRect.width);
  if(Number(textProp.value.fontSize)*ratio<minimumFont)
   throw Error('Reporter name is too long to fit legibly inside the white plate.');
  setReporterText(ratio);
  updatedRect=textLayer.sourceRectAtTime(centerAt,false);
 }
 if(updatedRect.width>maxTextWidth*1.01)
  throw Error('Reporter text still exceeds its white plate after fitting.');
 // Moving Anchor Point by the measured change in glyph center keeps the
 // ORIGINAL comp-space center while preserving Position keyframes, parents,
 // scale, rotation, masks and all original animation.
 var dx=(updatedRect.left+updatedRect.width/2)-fixedCenterX;
 var dy=(updatedRect.top+updatedRect.height/2)-fixedCenterY;
 var anchorProp=textLayer.property('ADBE Transform Group').property('ADBE Anchor Point');
 if(anchorProp.expressionEnabled)
  throw Error('Reporter Anchor Point uses an expression; automated centering needs a separate safe layout.');
 function shiftAnchor(v){
  var a=v.slice(0);a[0]+=dx;a[1]+=dy;return a;
 }
 if(anchorProp.numKeys>0){
  for(var ak=1;ak<=anchorProp.numKeys;ak++)
   anchorProp.setValueAtKey(ak,shiftAnchor(anchorProp.keyValue(ak)));
 }else anchorProp.setValue(shiftAnchor(anchorProp.value));
 writeLog('0813 REPORTER_CENTERED: center='+fixedCenterX+','+fixedCenterY+' width='+updatedRect.width+' max='+maxTextWidth+' offset='+dx+','+dy+' anchor adjusted');
}else{
 writeLog('0813 REPORTER_CENTERED_BOX_TEXT: center alignment inside existing text box');
}
writeLog('REPORTER_TEXT_CHANGED: '+String(textProp.value.text).substring(0,120));
// Do not assign renderQueue.rendering: read-only property in ExtendScript.
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
// 0813: only reporter text formatting and (for point text) its own anchor
 // are adjusted for visual centering; all original plate, logo, movement,
 // Position keyframes, scale, masks and linked graphic assets remain unchanged.
 writeLog('0813 REPORTER_NAME_CENTERED_IN_WHITE_PLATE');
 writeLog('ORIGINAL_ARTWORK_AND_ANIMATION_PRESERVED: yes');
if(reporterLocked)textLayer.locked=true;
// 0807: save the edited AEP AFTER configuring its transparent render queue.\n// The original template remains untouched.\nfor(var q=app.project.renderQueue.numItems;q>=1;q--)app.project.renderQueue.item(q).remove();
var rq=app.project.renderQueue.items.add(comp);var om=rq.outputModule(1);
// Output Module settings such as Format/Channels/Color may be read-only.
// Apply an installed Alpha template; never try to write read-only settings.
var templates=om.templates;writeLog('Available output templates: '+templates.join(' | '));
var candidates=[];for(var z=0;z<templates.length;z++)if(templates[z]==='Lossless with Alpha')candidates.push(templates[z]);
for(var z=0;z<templates.length;z++)if(/alpha/i.test(templates[z])&&candidates.join('|').indexOf(templates[z])<0)candidates.push(templates[z]);
if(!candidates.length)throw Error('No Alpha output template is installed. Available: '+templates.join(', '));
// Render queue settings are saved in the edited project for aerender.exe.
// This separates the scripted edit stage from the background rendering stage.
var prepared=false;
for(var attempt=0;attempt<candidates.length;attempt++){
 try{
  om.applyTemplate(candidates[attempt]);
  var st=om.getSettings(GetSettingsFormat.STRING);
  var fmt=String(st['Format']||'');writeLog('Transparent output template '+candidates[attempt]+' format='+fmt+' channels='+st['Channels']);
  var channels=String(st['Channels']||'');
  if(channels && !/alpha|rgba/i.test(channels)){
    writeLog('Rejected template without alpha: '+candidates[attempt]+' channels='+channels);
    continue;
  }
  var seq=/png|sequence|tiff|targa|exr/i.test(fmt);
  var ext=seq?'.png':(/quicktime|mov/i.test(fmt)?'.mov':'.avi');
  var target=seq?(framesFolder.fsName+'/tag-[#####]'+ext):(folder+'/tag-alpha-source'+ext);
  om.file=new File(target);
  rq.render=true;
  var editedProject=new File(${jsxString(path.join(exportDir,'RushFinder-Edited-'+job.id+'.aep'))});
  app.project.save(editedProject);
  writeLog('EDITED_AEP_SAVED: '+editedProject.fsName+' -> '+target);
  if(!editedProject.exists || editedProject.length<10000)throw Error('Edited AEP was not saved correctly');
  prepared=true;
  break;
 }catch(setupError){writeLog('Template preparation warning '+setupError.toString());}
}
if(!prepared)throw Error('Could not configure a transparent render output for the original project.');
// 0811: Regression fix. Render in the same After Effects process that opened
// and edited the AEP. The split edit/aerender flow in 0807-0809 yielded only
// the green logo on the user's Windows machine despite successfully relinking
// all PNG assets. Do not mark a job ready until real alpha output exists.
writeLog('0813 DIRECT_AE_RENDER_BEGIN');
app.project.renderQueue.render();
writeLog('0813 DIRECT_AE_RENDER_END status='+rq.status+' DONE='+RQItemStatus.DONE);
if(rq.status!==RQItemStatus.DONE)throw Error('After Effects render queue did not complete. Status='+rq.status);
var finishedFile=om.file;
if(seq){
 var made=framesFolder.getFiles(function(f){return f instanceof File&&/\\.png$/i.test(f.name);});
 if(made.length<3)throw Error('AE finished but PNG alpha frames are missing: '+made.length);
 writeLog('0813 OUTPUT_PNG_COUNT='+made.length);
}else if(!finishedFile.exists || finishedFile.length<1000){
 throw Error('AE finished but alpha master movie is missing: '+finishedFile.fsName);
}else{
 writeLog('0813 OUTPUT_ALPHA_SIZE='+finishedFile.length+' FILE='+finishedFile.fsName);
}
result.open('w');result.write('ALPHA_RENDERED');result.close();
writeLog('0813 DIRECT_AE_RENDER_VALIDATED');
}catch(e){writeLog('ERROR '+e.toString());error.open('w');error.write(e.toString());error.close();}finally{
 try{app.endSuppressDialogs(false)}catch(ignore){}
 // Close only the current project; leave the running After Effects application alive.
 // The user need not manually close the window before the next job.
 try{writeLog('Closing the After Effects worker automatically');
   if(app.project)app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
 }catch(closeError){writeLog('Project close: '+closeError.toString());}
 writeLog('AE script finished; next job can be scheduled.');
}
})();`;
const f=path.join(job.folder,'run.jsx');fs.writeFileSync(f,'\uFEFF'+script,'utf8');return f}


// 0820: standalone name + role template. Do not modify the reporter-tag AEP,
// reporter text algorithm, channel filter, or any of their rendering options.
const roleTemplate=path.join(root,'ae-original','تگ گزارش.aep');

// 0822: Read the ACTUAL external-media paths stored in the supplied AEP.
// Check existing paths and a portable role-assets directory; never invent replacement artwork.
function roleMediaFiles(){
 if(!fs.existsSync(roleTemplate))return [];
 const data=fs.readFileSync(roleTemplate).toString('utf8');
 const entries=[];const seen=new Set();
 const pathPattern=/"fullpath":"((?:\\.|[^"\\])+)"/g;
 let match;
 while((match=pathPattern.exec(data))!==null){
  let original;
  try{original=JSON.parse('"'+match[1]+'"');}catch(_e){continue;}
  if(!/\.(?:png|jpe?g|tiff?|bmp|psd|mov|mp4|avi)$/i.test(original))continue;
  const name=path.win32.basename(original);
  const key=name.toLocaleLowerCase();
  if(seen.has(key))continue;
  seen.add(key);
  const choices=[original,path.join(root,'ae-original','role-assets',name),path.join(root,'ae-original',name)];
  const available=choices.find(p=>{try{return fs.statSync(p).isFile()}catch(_e){return false}})||null;
  entries.push({name,original,available});
 }
 return entries;
}
function missingRoleMedia(){return roleMediaFiles().filter(a=>!a.available).map(a=>a.name)}
function roleMediaHelp(){return 'قالب «تگ گزارش.aep» به فایل‌های تصویری همراهش نیاز دارد: '+missingRoleMedia().join('، ')+'. فایل‌های اصلی را در پوشه ae-original/role-assets قرار دهید و دوباره تلاش کنید.'}

function scriptForRole(job){
 if(!fs.existsSync(roleTemplate))throw Error('فایل قالب تگ نام و سمت پیدا نشد: ae-original/تگ گزارش.aep');
 const relinkFiles=roleMediaFiles().filter(x=>!!x.available).map(x=>({name:x.name,file:x.available}));
 if(missingRoleMedia().length)throw Error(roleMediaHelp());
 const script=`(function(){
var folder=${jsxString(job.folder)},done=new File(folder+'/render.done'),error=new File(folder+'/render.error'),log=new File(folder+'/ae-render.log');
var framesFolder=new Folder(folder+'/alpha-frames');if(!framesFolder.exists)framesFolder.create();
function logIt(x){try{log.open('a');log.writeln('0823 ROLE | '+new Date().toString()+' | '+x);log.close();}catch(ignore){}}
logIt('SCRIPT_ENTERED: JSX 0823 executing in After Effects');
try{
 app.beginSuppressDialogs();try{app.exitAfterLaunchAndEval=true;}catch(ignore){}
 var src=new File(${jsxString(roleTemplate)});if(!src.exists)throw Error('Role AEP template missing');
 logIt('OPEN_STARTED: '+src.fsName);
 app.open(src);
 logIt('OPEN_RETURNED');
 if(!app.project||!app.project.file)throw Error('After Effects could not load role AEP');
 // Relink original files from ae-original/role-assets when the AEP's old Downloads paths no longer exist.
 var roleRelink=${JSON.stringify(relinkFiles)};
 for(var ri=1;ri<=app.project.numItems;ri++){
  var it=app.project.item(ri);
  if(!(it instanceof FootageItem))continue;
  var missing=false;
  try{missing=(it.mainSource instanceof FileSource)&&(!it.file||!it.file.exists)}catch(ignore){}
  if(!missing)continue;
  for(var rj=0;rj<roleRelink.length;rj++){
   var rp=roleRelink[rj],link=new File(rp.file);
   if(link.exists&&String(it.name).toLowerCase()===String(rp.name).toLowerCase()){
    it.replace(link);logIt('RELINKED '+rp.name);break;
   }
  }
 }
 logIt('FOOTAGE_RELINK_CHECK_DONE');
 logIt('COMP_SCAN_STARTED: items='+app.project.numItems);
 var comp=null;
 for(var i=1;i<=app.project.numItems;i++){
  var item=app.project.item(i);
  if(item instanceof CompItem&&String(item.name).toLowerCase()==='tag 5'){comp=item;break;}
 }
 if(!comp)throw Error('ترکیب Tag 5 در پروژه تگ گزارش پیدا نشد.');
 logIt('COMP_FOUND: '+comp.name+' '+comp.width+'x'+comp.height+' duration='+comp.duration);
 var layers=[],visited={};
 function collect(c){if(!c||visited[c.id])return;visited[c.id]=true;
  for(var li=1;li<=c.numLayers;li++){
   var layer=c.layer(li);
   try{
    var source=layer.property('ADBE Text Properties');
    if(source){var prop=source.property('ADBE Text Document');
     if(prop)layers.push({comp:c,layer:layer,prop:prop});}
   }catch(ignore){}
   try{if(layer.source instanceof CompItem)collect(layer.source);}catch(ignore){}
  }
 }
 logIt('TEXT_SCAN_STARTED');
 collect(comp);
 logIt('TEXT_SCAN_DONE: '+layers.length+' text layers');
 if(!layers.length)throw Error('هیچ لایه متن قابل ویرایشی داخل Tag 5 یافت نشد.');
 var updatedName=0,updatedRole=0;
 function normalizeText(s){return String(s||'').replace(/\\s+/g,' ').trim();}
 function replaceText(item,newText){
  var p=item.prop;if(p.expressionEnabled)return false;
  var locked=item.layer.locked;if(locked)item.layer.locked=false;
  try{
   var sampleTime=Math.max(0,Math.min(item.comp.duration*0.5,item.comp.duration-1/Math.max(1,item.comp.frameRate)));
   var oldRect=item.layer.sourceRectAtTime(sampleTime,false);
   var oldFont=Number(p.value.fontSize)||50;
   function edit(d,scale){d.text=newText;if(scale<1)d.fontSize=Number(d.fontSize)*scale;return d;}
   function update(scale){
    if(p.numKeys>0){for(var j=1;j<=p.numKeys;j++)p.setValueAtKey(j,edit(p.keyValue(j),scale));}
    else p.setValue(edit(p.value,scale));
   }
   update(1);
   // Preserve template font, anchor, alignment and keyframed animations.
   // Only reduce font on overlong names/titles; never enlarge it.
   if(oldRect.width>10){
    for(var n=0;n<7;n++){
     var newRect=item.layer.sourceRectAtTime(sampleTime,false);
     if(newRect.width<=oldRect.width*1.04)break;
     var ratio=Math.min(.96,.98*oldRect.width/newRect.width);
     if(Number(p.value.fontSize)*ratio<Math.max(8,oldFont*.38)){
      logIt('Long text kept at minimum legible size '+item.layer.name);break;
     }
     update(ratio);
    }
   }
   logIt('Updated '+item.comp.name+'/'+item.layer.name+' = '+newText);
   return true;
  }finally{if(locked)item.layer.locked=true;}
 }
 for(var t=0;t<layers.length;t++){
  var item=layers[t],prop=item.prop;
  var sample=normalizeText(prop.value.text);
  logIt('Candidate '+item.comp.name+'/'+item.layer.name+' = '+sample.substring(0,110)+' expression='+prop.expressionEnabled);
  if(sample==='گزارشگر فلانی'||sample==='NULL گزارشگر فلانی'){
   if(replaceText(item,${jsxString(job.fullName)}))updatedName++;
  }else if(sample==='بررسی عوامل گرانی همه چیز'||sample==='NULL بررسی عوامل گرانی همه چیز'){
   if(replaceText(item,${jsxString(job.roleTitle)}))updatedRole++;
  }
 }
 if(updatedName<1||updatedRole<1)throw Error('هر دو متن نمونه قالب (گزارشگر فلانی / بررسی عوامل گرانی همه چیز) در لایه‌های قابل‌ویرایش Tag 5 پیدا نشدند. نام: '+updatedName+'، سمت: '+updatedRole+'؛ رندر بدون جایگزینی انجام نمی‌شود.');
 logIt('Both text fields replaced; name='+updatedName+' role='+updatedRole);
 // Reject missing active footage instead of producing a broken/misleading MP4.
 var missing=[];
 function checkFoot(c,seen){if(seen[c.id])return;seen[c.id]=true;
  for(var i=1;i<=c.numLayers;i++){
   var l=c.layer(i);if(!l.enabled)continue;
   try{
    if(l.source instanceof CompItem){checkFoot(l.source,seen);}
    else if(l.source instanceof FootageItem&&l.source.mainSource instanceof FileSource){
     if(!l.source.file||!l.source.file.exists)missing.push(l.source.name);
    }
   }catch(ignore){}
  }
 }
 checkFoot(comp,{});
 if(missing.length)throw Error('فایل تصویری/ویدیویی موردنیاز قالب تگ گزارش در دسترس نیست: '+missing.join(', ')+'. فایل‌های مرتبط با پروژه AEP باید کنار آن قرار بگیرند.');
 for(var q=app.project.renderQueue.numItems;q>=1;q--)app.project.renderQueue.item(q).remove();
 var rq=app.project.renderQueue.items.add(comp),om=rq.outputModule(1);
 var templates=om.templates,candidates=[];
 for(var z=0;z<templates.length;z++)if(templates[z]==='Lossless with Alpha')candidates.push(templates[z]);
 for(var z=0;z<templates.length;z++)if(/alpha/i.test(templates[z])&&candidates.join('|').indexOf(templates[z])<0)candidates.push(templates[z]);
 if(!candidates.length)throw Error('هیچ خروجی شفاف Alpha در تنظیمات After Effects نصب نیست.');
 var prepared=false,seq=false,target='';
 for(var a=0;a<candidates.length;a++){
  try{
   om.applyTemplate(candidates[a]);
   var settings=om.getSettings(GetSettingsFormat.STRING),fmt=String(settings['Format']||'');
   var channels=String(settings['Channels']||'');
   if(channels && !/alpha|rgba/i.test(channels))continue;
   seq=/png|sequence|tiff|targa|exr/i.test(fmt);
   var ext=seq?'.png':(/quicktime|mov/i.test(fmt)?'.mov':'.avi');
   target=seq?(framesFolder.fsName+'/tag-[#####]'+ext):(folder+'/tag-alpha-source'+ext);
   om.file=new File(target);rq.render=true;
   var edited=new File(${jsxString(path.join(exportDir,'RushFinder-Role-Edited-'+job.id+'.aep'))});
   app.project.save(edited);
   if(!edited.exists||edited.length<10000)throw Error('Edited role project was not saved');
   logIt('Alpha template='+candidates[a]+' target='+target);prepared=true;break;
  }catch(templateErr){logIt('Template failed: '+templateErr);}
 }
 if(!prepared)throw Error('After Effects نتوانست خروجی شفاف تگ نام و سمت را تنظیم کند.');
 app.project.renderQueue.render();
 if(rq.status!==RQItemStatus.DONE)throw Error('رندر تگ نام و سمت کامل نشد: '+rq.status);
 if(seq){var files=framesFolder.getFiles(function(f){return f instanceof File&&/\\.png$/i.test(f.name);});if(files.length<3)throw Error('فریم‌های شفاف کافی ساخته نشد.');}
 else{var rendered=new File(target);if(!rendered.exists||rendered.length<1000)throw Error('فایل شفاف رندر ساخته نشد.');}
 done.open('w');done.write('ROLE_ALPHA_RENDERED');done.close();logIt('Render completed');
}catch(e){
 var detail=''+e;
 try{if(e&&e.line)detail+=' | JSX line '+e.line;}catch(ignore){}
 logIt('ERROR '+detail);
 try{
  var tmpErr=new File(folder+'/render.error.pending');
  if(tmpErr.open('w')){tmpErr.write(detail);tmpErr.close();
   if(!tmpErr.rename('render.error'))throw Error('Cannot publish role error marker');
  }else throw Error('Cannot write role error marker');
 }catch(writeErr){try{if(error.open('w')){error.write(detail);error.close();}}catch(ignore){}}
}
finally{try{app.endSuppressDialogs(false)}catch(ignore){}
 try{if(app.project)app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);}catch(ignore){}}
})();`;
 const f=path.join(job.folder,'run-role.jsx');fs.writeFileSync(f,'\uFEFF'+script,'utf8');return f;
}

function verifyRoleTag(ff,mov){
 return new Promise((resolve,reject)=>{
  const args=['-hide_banner','-i',mov,'-vf','fps=8,format=rgba,alphaextract,bbox=min_val=24','-an','-f','null','-'];
  let stderr='';const proc=cp.spawn(ff,args,{windowsHide:true});
  proc.stderr.on('data',c=>{stderr+=c.toString();if(stderr.length>1800000)stderr=stderr.slice(-1800000)});
  proc.on('error',reject);
  proc.on('close',code=>{
   if(code!==0)return reject(Error('بررسی آلفای تگ نام و سمت ناموفق شد: '+stderr.slice(-800)));
   const match=/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/.exec(stderr);
   if(!match)return reject(Error('ابعاد خروجی شفاف تگ نام و سمت شناسایی نشد.'));
   const canvasW=+match[1],canvasH=+match[2],boxes=[];
   for(const line of stderr.split(/\r?\n/)){
    if(!/Parsed_bbox/.test(line))continue;
    const b=/\bx1:(\d+)\s+x2:(\d+)\s+y1:(\d+)\s+y2:(\d+)\s+w:(\d+)\s+h:(\d+)/.exec(line);
    if(b)boxes.push({x:+b[1],y:+b[3],w:+b[5],h:+b[6]});
   }
   const content=boxes.filter(b=>b.w>=20&&b.h>=5);
   if(content.length<2)return reject(Error('خروجی تگ نام و سمت هیچ عنصر شفاف قابل‌نمایشی ندارد.'));
   const x0=Math.min(...content.map(b=>b.x)),y0=Math.min(...content.map(b=>b.y));
   const x1=Math.max(...content.map(b=>b.x+b.w)),y1=Math.max(...content.map(b=>b.y+b.h));
   const bounds={x:x0,y:y0,w:x1-x0,h:y1-y0};
   if(bounds.w>canvasW*.96&&bounds.h>canvasH*.85)
    return reject(Error('قالب شامل پس‌زمینه تقریباً تمام‌صفحه است؛ برای تگ روی فیلم به رندر شفاف نیاز است.'));
   resolve({canvasW,canvasH,bounds});
  });
 });
}

function ffmpegExe(){for(const f of [path.join(root,'tools','ffmpeg.exe'),path.join(process.env.LOCALAPPDATA||'', 'RushFinder','tools','ffmpeg.exe'),path.join(root,'ffmpeg.exe'),path.join(process.env.LOCALAPPDATA||'', 'Microsoft','WinGet','Links','ffmpeg.exe'),'ffmpeg']){try{const r=cp.spawnSync(f,['-version'],{windowsHide:true,timeout:5000});if(r.status===0)return f}catch(e){}}return null}
// 0818: Read the desired CHANNEL tag width (%) from a simple editable text file.
// Read anew for each job, so users can resize the channel tag without editing JS.
function channelTagSizePercent(){
  try {
    const value=Number(fs.readFileSync(path.join(root,'CHANNEL-TAG-SIZE.txt'),'utf8').trim());
    if(Number.isFinite(value)&&value>=5&&value<=40)return value;
  }catch(_ignored){}
  return 12;
}
function report(){return {afterEffects:!!aeExe(),backgroundRenderer:!!(aeExe()&&fs.existsSync(path.join(path.dirname(aeExe()),'aerender.exe'))),afterEffectsPath:aeExe()||'',ffmpeg:!!ffmpegExe(),ffmpegPath:ffmpegExe()||'',project:fs.existsSync(template),templateName:path.basename(template),assetsReady:['ت2گ copy.png','تگ copy.png','Micropho4.png'].every(name=>fs.existsSync(path.join(root,'ae-original',name))),local:true,version:"0813",engineBuild:"0819-channel-size-control",channelTagWidthPercent:channelTagSizePercent(),channelTagControl:true,roleBuild:"0823-role-render-diagnostics",roleMediaMissing:missingRoleMedia(),roleTag:!!aeExe()&&!!ffmpegExe()&&fs.existsSync(roleTemplate),roleTemplateName:path.basename(roleTemplate),channelTag:!!ffmpegExe()&&fs.existsSync(path.join(root,'assets','news-tag','fori-channel-tag.png')),outputFolder:exportDir,tempFolder:work,installRoot:root.replace(/\\/g,'/')}}
// 0814: dedicated CHANNEL-tag render. The existing reporter After Effects path below
// is intentionally unchanged. This mode uses the exact supplied transparent PNG.
function renderChannelTag(job){
 const logo=path.join(root,'assets','news-tag','fori-channel-tag.png');
 let finished=false;
 const fail=error=>{
  if(finished)return;
  finished=true;job.state='error';
  job.message='ساخت تگ کانال خبرفوری ناموفق بود: '+String(error);
 };
 try{
  const ff=ffmpegExe();
  if(!ff)throw Error('FFmpeg پیدا نشد.');
  if(!fs.existsSync(logo))throw Error('تصویر تگ کانال خبرفوری موجود نیست.');
  const size=videoDimensions(ff,job.input);
  const tagPercent=Number(job.channelTagPercent);
  if(!Number.isInteger(tagPercent)||tagPercent<6||tagPercent>40)throw Error('اندازه تگ کانال باید از ۶ تا ۴۰ درصد باشد.');
  const tagWidth=Math.max(2,Math.round(size.width*(tagPercent/100)/2)*2);
  job.channelTagWidthPercent=tagPercent;
  job.channelTagWidthPixels=tagWidth;
  const padRight=Math.max(0,Math.round(size.width*0.025));
  const padBottom=Math.max(0,Math.round(size.height*0.075));
  const filter='[1:v]format=rgba,scale='+tagWidth+':-2:flags=lanczos,setsar=1[tag];'+
   '[0:v][tag]overlay=x=main_w-overlay_w-'+padRight+':y=main_h-overlay_h-'+padBottom+
   ':shortest=1:format=auto,format=yuv420p[v]';
  const output=path.join(exportDir,job.id+'.mp4');
  const args=['-hide_banner','-y','-i',job.input,'-loop','1','-framerate','25','-i',logo,
   '-filter_complex',filter,'-map','[v]','-map','0:a?',
   '-c:v','libx264','-preset','medium','-crf','18','-c:a','aac','-movflags','+faststart',output];
  job.state='rendering';job.message='در حال قرار دادن تگ کانال خبرفوری روی فیلم...';
  const proc=cp.spawn(ff,args,{windowsHide:true});
  let ffLog='';
  proc.stderr.on('data',data=>{ffLog=(ffLog+data.toString()).slice(-5000)});
  proc.on('error',fail);
  proc.on('close',code=>{
   if(finished)return;
   if(code!==0||!fs.existsSync(output)||fs.statSync(output).size<1000)
    return fail('FFmpeg: '+ffLog.slice(-1600));
   finished=true;job.state='done';job.message='تگ کانال خبرفوری با اندازه '+job.channelTagWidthPercent+'٪ (عرض '+job.channelTagWidthPixels+' پیکسل) آماده است.';
   fs.rm(job.folder,{recursive:true,force:true,maxRetries:4,retryDelay:1000},
    error=>{if(error)console.warn('Channel temp cleanup failed:',error.message)});
  });
 }catch(error){fail(error.message)}
}

// 0811: Direct After Effects render, without a second aerender process.
function runActive(job){if(job.mode==='channel'){renderChannelTag(job);return;}const fail=e=>{job.state='error';let tail='';try{const f=path.join(job.folder,'ae-render.log');if(fs.existsSync(f))tail=fs.readFileSync(f,'utf8').split(/\r?\n/).filter(Boolean).slice(-10).join('\n').slice(-2500);}catch(ignore){}job.message=String(e)+(tail?'\nآخرین گزارش واقعی افتر افکت:\n'+tail:'\nگزارش افتر افکت هنوز ایجاد نشده است.');};(async()=>{try{job.state='rendering';job.message='مرحله ۱/۳: بازکردن AEP، اصلاح متن و رندر شفاف در خود After Effects...';const exe=aeExe();if(!exe)throw Error('After Effects در Program Files/Adobe پیدا نشد.');if(!ffmpegExe())throw Error('FFmpeg پیدا نشد. فایل ffmpeg.exe مخصوص ویندوز را در پوشه tools کنار سایت قرار بدهید، یا FFmpeg را در PATH نصب کنید.');const script=job.mode==='role'?scriptForRole(job):scriptFor(job);job.message='مرحله ۱/۳: پروژه اصلی در After Effects در حال آماده‌سازی و رندر است.';// Launch AE directly as in the last functioning releases. PowerShell Start-Process
 // occasionally loses the JSX -r argument and prevents script startup.
 // -m starts a separate AE instance: never inject the script into a user's
 // already-running After Effects session. -noui requests a hidden editing
 // process; -r executes our per-job JSX inside that instance.
 // Note: Adobe's GUI suppression can vary by version; the separate aerender
 // stage is always a command-line render.
 const launchArgs=['-m','-noui','-r',script];
 fs.appendFileSync(path.join(job.folder,'worker-launch.log'),
   'EXE='+exe+'\\nARGS='+JSON.stringify(launchArgs)+'\\n');
 const proc=cp.spawn(exe,launchArgs,{cwd:job.folder,windowsHide:true,detached:false,stdio:['ignore','pipe','pipe']});
 proc.stdout.on('data',b=>fs.appendFileSync(path.join(job.folder,'worker-launch.log'),b));
 proc.stderr.on('data',b=>fs.appendFileSync(path.join(job.folder,'worker-launch.log'),b));
 // Scripted editing may briefly expose the Adobe GUI on some versions;
 // the actual render happens separately with aerender.exe in the background.
 proc.on('error',fail);let roleWorkerExit=null;
 proc.on('exit',(code,signal)=>{
  if(job.mode==='role'){
   roleWorkerExit={code,signal,at:Date.now()};
   try{fs.appendFileSync(path.join(job.folder,'worker-launch.log'),'\nWORKER_EXIT code='+code+' signal='+signal+'\n');}catch(ignore){}
  }else if(code!==0&&job.state==='rendering'&&!fs.existsSync(path.join(job.folder,'ae-render.log'))){
   job.message='راه‌اندازی موتور با کد '+code+' پایان یافت؛ در حال بررسی گزارش افتر افکت...';
  }
 });let elapsed=0;const timer=setInterval(()=>{
  elapsed+=2;
  if(job.state==='error'){clearInterval(timer);return}
  const errorPath=path.join(job.folder,'render.error'), donePath=path.join(job.folder,'render.done'), logPath=path.join(job.folder,'ae-render.log');
  if(fs.existsSync(errorPath)){
   const errorText=fs.readFileSync(errorPath,'utf8').trim();
   const errorAge=Date.now()-fs.statSync(errorPath).mtimeMs;
   if(job.mode==='role'&&!errorText&&errorAge<6000){job.message='در حال دریافت گزارش خطای After Effects...';return}
   clearInterval(timer);
   fail(errorText||'After Effects فایل خطای خالی ایجاد کرد. گزارش راه‌اندازی و آخرین مراحل در پوشه کار رندر ثبت شده است.');return
  }
  if(fs.existsSync(donePath)){clearInterval(timer);job.message='خروجی شفاف در خود After Effects ساخته شد؛ در حال بررسی و ترکیب...';blend(job).catch(fail);return}
  if(job.mode==='role'&&roleWorkerExit&&roleWorkerExit.code!==0&&Date.now()-roleWorkerExit.at>8000){
   const code=roleWorkerExit.code,signal=roleWorkerExit.signal;
   clearInterval(timer);
   fail('پردازش After Effects قبل از ساخت خروجی یا ثبت خطای کامل متوقف شد. کد خروج: '+code+(signal?'، سیگنال: '+signal:'')+'. آخرین مراحل در گزارش زیر ثبت شده‌اند. فایل Get-Role-Render-Log.cmd را اجرا کنید تا گزارش کامل آماده شود.');return;
  }
  let message='مرحله ۱/۳: اجرای پروژه اصلی After Effects';
  message+=' | زمان سپری‌شده: '+Math.floor(elapsed/60)+' دقیقه و '+(elapsed%60)+' ثانیه';
  if(fs.existsSync(logPath)){
    try{const lines=fs.readFileSync(logPath,'utf8').split(/\r?\n/).filter(Boolean);if(lines.length)message+='\nآخرین پیام افتر افکت: '+lines[lines.length-1].slice(-280)}catch(e){}
  }else if(elapsed>=30){message+='\nاسکریپت هنوز شروع نشده است. ممکن است After Effects مشغول بازکردن پروژه یا منتظر تأیید باشد.'}
  try{
    const file=fs.readdirSync(job.folder).filter(n=>/^tag-alpha-source\.(mov|avi)$/i.test(n)).map(n=>path.join(job.folder,n)).find(p=>fs.statSync(p).size>0);
    if(file){message+='\nفایل خروجی آلفا: '+(fs.statSync(file).size/1048576).toFixed(1)+' مگابایت';}
  }catch(e){}
  if(elapsed>=90&&!fs.existsSync(logPath)){
   clearInterval(timer);
   if(job.mode==='role'){
    const launchLog=path.join(job.folder,'worker-launch.log');
    let detail='';try{detail=fs.readFileSync(launchLog,'utf8').slice(-1200)}catch(_e){}
    fail('اسکریپت «تگ نام و سمت» در After Effects شروع نشده است. فایل تگ گزارش.aep را یک‌بار در افتر باز کنید و پیام‌های مربوط به فایل‌های گمشده یا افزونه‌ها را بررسی کنید. گزارش راه‌اندازی: '+launchLog+(detail?' | '+detail:''));
   }else fail('After Effects فرمان اسکریپت را اجرا نکرد. در نسخه 0778 خطای راه‌اندازی با گزارش ثبت می‌شود. After Effects فرمان جدید را نپذیرفت؛ اجرای خودکار نشست قبلی را بررسی کنید.');
   return;
  }
  if(elapsed>=300)message+='\n⚠ پنج دقیقه گذشته است؛ اگر اندازه فایل آلفا افزایش نمی‌یابد، پنجره After Effects را بررسی کنید.';
  if(elapsed>=1200){clearInterval(timer);fail('رندر After Effects پس از ۲۰ دقیقه به پایان نرسید. '+(job.mode==='role'&&roleWorkerExit?'آخرین کد خروج پردازش: '+roleWorkerExit.code+'. ':'')+'آخرین وضعیت: '+message);return}
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

// 0809: The ORIGINAL lower third occupies a limited region of a much wider
// AE composition (3471x212). Dynamic cropdetect from 0803-0809 can include
// unrelated animation bounds and shrink the white plate away. Never crop.
// Validate the alpha render, and position the unmodified AE canvas according
// to the known bounds of the original full plate instead.
function verifyCompleteTag(ff,mov){
 // Do not reject a lower-third just because its height is small compared to
 // a tall AE composition. Version 0811 falsely rejected 919px-wide artwork
 // on a 1200x1080 canvas because h < 12% of canvas height.
 return new Promise((resolve,reject)=>{
   const args=['-hide_banner','-i',mov,'-vf',
     'fps=8,format=rgba,alphaextract,bbox=min_val=24',
     '-an','-f','null','-'];
   let stderr='';
   const proc=cp.spawn(ff,args,{windowsHide:true});
   proc.stderr.on('data',c=>{stderr+=c.toString();if(stderr.length>2000000)stderr=stderr.slice(-2000000)});
   let ended=false;
   function finish(err,info){
     if(ended)return;ended=true;
     if(err)reject(Error(err));else resolve(info);
   }
   proc.on('error',e=>finish('Cannot inspect AE alpha: '+e.message));
   proc.on('close',code=>{
     if(ended)return;
     if(code!==0)return finish('FFmpeg alpha inspection failed: '+stderr.slice(-1200));
     const size=/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/.exec(stderr);
     if(!size)return finish('Cannot determine AE alpha canvas dimensions');
     const canvasW=Number(size[1]),canvasH=Number(size[2]);
     const boxes=[];
     for(const line of stderr.split(/\r?\n/)){
       if(!/Parsed_bbox/.test(line))continue;
       const b=/\bx1:(\d+)\s+x2:(\d+)\s+y1:(\d+)\s+y2:(\d+)\s+w:(\d+)\s+h:(\d+)/.exec(line);
       if(b)boxes.push({x:+b[1],y:+b[3],w:+b[5],h:+b[6]});
     }
     const maxVisibleWidth=boxes.length?Math.max(...boxes.map(b=>b.w)):0;
     // The bar is *wide and thin*. Do not use a percentage of canvas height.
     // Require actual alpha content across at least two frames, avoiding
     // successful rendering of just the much narrower isolated logo.
     const minBarWidth=Math.max(150,canvasW*0.35);
     const plateFrames=boxes.filter(b=>b.w>=minBarWidth && b.h>=5);
     const info={canvasW,canvasH,framesChecked:boxes.length,
       plateFrames:plateFrames.length,maxVisibleWidth};
     if(plateFrames.length<2)
       return finish('خروجی شفاف، نوار کامل قابل تشخیص ندارد. '+JSON.stringify(info));
     // Anchor to visible (not transparent) bounds, preserving the full
     // unchanged canvas and all motion. No dynamic cropping whatsoever.
     const content=boxes.filter(b=>b.w>=Math.max(minBarWidth,maxVisibleWidth*0.55) && b.h>=5);
     const x0=Math.min(...content.map(b=>b.x));
     const y0=Math.min(...content.map(b=>b.y));
     const x1=Math.max(...content.map(b=>b.x+b.w));
     const y1=Math.max(...content.map(b=>b.y+b.h));
     info.bounds={x:x0,y:y0,w:x1-x0,h:y1-y0};
     finish(null,info);
   });
 });
}
function videoDimensions(ff,videoFile){
 // Probe only the incoming reporter video. scale2ref previously used the
 // wrong frame as its reference and distorted the result.
 const r=cp.spawnSync(ff,['-hide_banner','-i',videoFile],{
   windowsHide:true,encoding:'utf8',timeout:12000,maxBuffer:1024*1024
 });
 const log=String(r.stderr||'');
 const line=log.split(/\r?\n/).find(l=>/Stream #\d+:\d+.*Video:/.test(l));
 const m=line&&/\b(\d{2,5})x(\d{2,5})\b/.exec(line);
 if(!m)throw Error('ابعاد فیلم ورودی با FFmpeg مشخص نشد. '+log.slice(-500));
 return {width:Number(m[1]),height:Number(m[2])};
}
function blend(job){
 return new Promise((resolve,reject)=>{
  job.state='converting';
  job.message='مرحله ۲/۳: ساخت MOV شفاف از خروجی اصلی After Effects...';
  const frameDir=path.join(job.folder,'alpha-frames');
  const frames=fs.existsSync(frameDir)?fs.readdirSync(frameDir).filter(n=>/\.png$/i.test(n)).sort():[];
  const source=fs.readdirSync(job.folder).filter(n=>/^tag-alpha-source\.(mov|avi)$/i.test(n))
    .map(n=>path.join(job.folder,n)).find(p=>fs.statSync(p).size>1000);
  const mov=path.join(job.folder,'tag-transparent.mov');
  if(!source && frames.length<3)return reject(Error('رندر شفاف AE ساخته نشد؛ ae-render.log را بررسی کنید.'));
  const ff=ffmpegExe();
  const args1=frames.length>=3
   ? ['-hide_banner','-y','-framerate','30','-pattern_type','sequence','-i',
      path.join(frameDir,frames[0].replace(/\d+(?=\.png$)/,m=>'%0'+m.length+'d')),
      '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16',mov]
   : ['-hide_banner','-y','-i',source,
      '-an','-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16',mov];
  const c1=cp.spawn(ff,args1,{windowsHide:true});
  let err1='',completed=false;
  const fail=err=>{if(completed)return;completed=true;reject(err instanceof Error?err:Error(String(err)))};
  c1.stderr.on('data',x=>err1=(err1+x.toString()).slice(-9000));
  c1.on('error',fail);
  c1.on('close',async code=>{
   if(completed)return;
   if(code!==0||!fs.existsSync(mov)||fs.statSync(mov).size<1000)
      return fail('تبدیل MOV شفاف ناموفق: '+err1.slice(-1600));
   try{
    job.state='validating';
    job.message='بررسی وجود نوار سفید، متن و لوگو در خروجی شفاف...';
    const qa=await (job.mode==='role'?verifyRoleTag(ff,mov):verifyCompleteTag(ff,mov));
    fs.appendFileSync(path.join(job.folder,'ae-render.log'),
       '0809 alpha verification '+JSON.stringify(qa)+'\n');
    // Anchor the full unmodified alpha canvas by its measured visible bounds.
    // Never crop or stretch the exported AEP lower third.
    job.state='combining';
    job.message='مرحله ۳/۳: جایگذاری MOV شفاف روی فیلم...';
    const videoSize=videoDimensions(ff,job.input);
    const scale=(videoSize.width*(job.mode==='role'?0.38:0.40))/qa.bounds.w;
    const tagWidth=Math.max(2,Math.round((qa.canvasW*scale)/2)*2);
    const realScale=tagWidth/qa.canvasW;
    const x=Math.round(videoSize.width*0.975-(qa.bounds.x+qa.bounds.w)*realScale);
    const y=Math.round(videoSize.height*0.925-(qa.bounds.y+qa.bounds.h)*realScale);
    const filter=[
      '[1:v]format=rgba,setsar=1,scale='+tagWidth+':-2:flags=lanczos[tag]',
      '[0:v][tag]overlay=x='+x+':y='+y+':shortest=0:repeatlast=0:eof_action=pass:format=auto,format=yuv420p[v]'
    ].join(';');
    fs.appendFileSync(path.join(job.folder,'ae-render.log'),
      '0813 overlay '+JSON.stringify({videoSize,bounds:qa.bounds,scale:realScale,x,y})+'\\n');
    const out=path.join(exportDir,job.id+'.mp4');
    const args=['-hide_banner','-y','-i',job.input,'-i',mov,
      '-filter_complex',filter,'-map','[v]','-map','0:a?',
      '-c:v','libx264','-preset','medium','-crf','18','-c:a','aac',
      '-movflags','+faststart',out];
    const c2=cp.spawn(ff,args,{windowsHide:true});
    let err2='',finalized=false;
    c2.stderr.on('data',x=>err2=(err2+x.toString()).slice(-12000));
    c2.on('error',fail);
    c2.on('close',n=>{
      if(finalized||completed)return;finalized=true;
      if(n!==0||!fs.existsSync(out)||fs.statSync(out).size<1000)
        return fail('ترکیب MP4 ناموفق: '+err2.slice(-2400));
      completed=true;
      job.state='done';job.message='تگ کامل با کنترل شفافیت رندر شد؛ MP4 آماده دانلود است.';
      try{
        const logsDir=path.join(exportDir,'Render-Logs');
        fs.mkdirSync(logsDir,{recursive:true});
        for(const logName of ['ae-render.log','aerender.log','worker-launch.log']){
          const file=path.join(job.folder,logName);
          if(fs.existsSync(file))fs.copyFileSync(file,path.join(logsDir,job.id+'-'+logName));
        }
      }catch(e){console.warn('Archive logs failed:',e.message)}
      fs.rm(job.folder,{recursive:true,force:true,maxRetries:4,retryDelay:1000},
        e=>{if(e)console.warn('Temp cleanup failed:',e.message)});
      resolve();
    });
   }catch(e){fail(e)}
  });
 });
}

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webm':'video/webm','.mp4':'video/mp4','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
// 0800: the public website can talk only to this local engine, on the same Windows PC.
// Explicitly allow the official hosted site; do not expose the rendering API to arbitrary sites.
const trustedWebOrigins=new Set([
 'https://rushfinder.vercel.app',
 'http://127.0.0.1:18826',
 'http://localhost:18826'
]);
const trustedHostnames=new Set(['127.0.0.1:18826','localhost:18826']);
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
// 0814: channel mode only. The existing /ae-api/create reporter route remains intact.
// 0820: isolated role model; reporter and channel routes remain unchanged.
if(u.pathname==='/ae-api/role-create' && req.method==='POST'){
 const fullName=(u.searchParams.get('fullName')||'').trim();
 const roleTitle=(u.searchParams.get('roleTitle')||'').trim();
 if(!fullName||fullName.length>100||!roleTitle||roleTitle.length>100)
  return respond(res,400,{error:'نام و نام خانوادگی و سمت باید هر کدام بین ۱ تا ۱۰۰ حرف باشند.'});
 if(missingRoleMedia().length)return respond(res,503,{error:roleMediaHelp(),missingRoleMedia:missingRoleMedia()});
 if(!aeExe()||!ffmpegExe()||!fs.existsSync(roleTemplate))
  return respond(res,503,{error:'برای تگ نام و سمت، After Effects، FFmpeg و فایل ae-original/تگ گزارش.aep لازم است.'});
 const id=crypto.randomUUID(),folder=path.join(work,id);fs.mkdirSync(folder,{recursive:true});
 const ext=(path.extname(u.searchParams.get('filename')||'').toLowerCase().match(/^\.(mp4|mov|webm|m4v|avi)$/)||[])[0]||'.mp4';
 const job={id,folder,mode:'role',fullName,roleTitle,input:path.join(folder,'source-video'+ext),state:'uploading',message:'دریافت فیلم...'};
 jobs.set(id,job);let total=0;const f=fs.createWriteStream(job.input);
 req.on('data',c=>{total+=c.length;if(total>1024*1024*1024){req.destroy();f.destroy();}});
 req.pipe(f);
 f.on('finish',()=>{job.state='queued';job.message='فیلم در صف رندر تگ نام و سمت قرار گرفت.';respond(res,200,{id});run(job)});
 req.on('error',()=>{job.state='error';job.message='آپلود فیلم متوقف شد.'});
 return;
}
if(u.pathname==='/ae-api/channel-create' && req.method==='POST'){
 const ff=ffmpegExe(),logo=path.join(root,'assets','news-tag','fori-channel-tag.png');
 if(!ff||!fs.existsSync(logo))return respond(res,503,{error:!ff?'FFmpeg روی موتور رندر پیدا نشد.':'تصویر تگ کانال پیدا نشد.'});
 const id=crypto.randomUUID(),folder=path.join(work,id);
 fs.mkdirSync(folder,{recursive:true});
 const ext=(path.extname(u.searchParams.get('filename')||'').toLowerCase().match(/^\.(mp4|mov|webm|m4v|avi)$/)||[])[0]||'.mp4';
 const sizeText=u.searchParams.get('tagPercent');
 const tagPercent=(sizeText===null||sizeText==='')?channelTagSizePercent():Number(sizeText);
 if(!Number.isInteger(tagPercent)||tagPercent<6||tagPercent>40)return respond(res,400,{error:'درصد اندازه تگ کانال معتبر نیست (۶ تا ۴۰).'});
 const job={id,folder,mode:'channel',channelTagPercent:tagPercent,name:'',input:path.join(folder,'source-video'+ext),state:'uploading',message:'دریافت فیلم...'};
 jobs.set(id,job);
 let total=0;const f=fs.createWriteStream(job.input);
 req.on('data',c=>{total+=c.length;if(total>1024*1024*1024){req.destroy();f.destroy()}});
 req.pipe(f);
 f.on('finish',()=>{job.state='queued';job.message='در صف رندر...';respond(res,200,{id,channelTagWidthPercent:tagPercent});run(job)});
 req.on('error',()=>{job.state='error';job.message='آپلود فیلم متوقف شد.'});
 return;
}
if(u.pathname==='/ae-api/create' && req.method==='POST'){
const name=(u.searchParams.get('name')||'').trim();if(!name||name.length>140)return respond(res,400,{error:'نام باید بین یک تا ۱۴۰ حرف باشد.'});if(!aeExe()||!ffmpegExe()||!fs.existsSync(template)||!['ت2گ copy.png','تگ copy.png','Micropho4.png'].every(n=>fs.existsSync(path.join(root,'ae-original',n))))return respond(res,503,{error:'پیش‌نیاز ناقص: '+(!aeExe()?'After Effects ':'')+(!aeExe()||!fs.existsSync(path.join(path.dirname(aeExe()||''),'aerender.exe'))?'aerender ':'')+(!ffmpegExe()?'FFmpeg ':'')+(!fs.existsSync(template)?'AEP ':'')+(!['ت2گ copy.png','تگ copy.png','Micropho4.png'].every(n=>fs.existsSync(path.join(root,'ae-original',n)))?'PNG original assets ':'')});const id=crypto.randomUUID(),folder=path.join(work,id);fs.mkdirSync(folder,{recursive:true});const job={id,folder,name,input:path.join(folder,'source-video'+(path.extname(u.searchParams.get('filename')||'').toLowerCase().match(/^\.(mp4|mov|webm|m4v|avi)$/)?.[0]||'.mp4')),state:'uploading',message:'دریافت فیلم...'};jobs.set(id,job);let total=0;const f=fs.createWriteStream(job.input);req.on('data',c=>{total+=c.length;if(total>1024*1024*1024){req.destroy();f.destroy()}});req.pipe(f);f.on('finish',()=>{job.state='queued';job.message='در صف رندر...';respond(res,200,{id});run(job)});req.on('error',()=>{job.state='error';job.message='آپلود فیلم متوقف شد.'});return;}
if(u.pathname==='/ae-api/status'){const j=jobs.get(u.searchParams.get('id'));if(!j)return respond(res,200,{state:'error',message:'پردازش پیدا نشد.'});return respond(res,200,{id:j.id,state:j.state,message:j.message,channelTagWidthPercent:j.mode==='channel'?j.channelTagWidthPercent:null,channelTagWidthPixels:j.mode==='channel'?j.channelTagWidthPixels:null});}
let file;try{if(u.pathname.startsWith('/ae-output/')){const id=path.basename(u.pathname,'.mp4');if(!/^[a-f0-9-]{36}$/.test(id))throw Error();file=path.join(exportDir,id+'.mp4')}else{if(u.pathname.startsWith('/ae-jobs')||u.pathname.startsWith('/ae-original')||u.pathname.startsWith('/tools/'))throw Error();file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))throw Error()}}catch{return respond(res,403,{error:'Forbidden'})}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.stat(file,(err,s)=>{if(err||!s.isFile()){res.writeHead(404);res.end('Not found');return}let start=0,end=s.size-1,code=200,headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};if(req.headers.range){const m=/bytes=(\d+)-(\d*)/.exec(req.headers.range);if(m){start=Number(m[1]);end=m[2]?Number(m[2]):end;if(start>end||start>=s.size){res.writeHead(416);res.end();return}code=206;headers['Content-Range']=`bytes ${start}-${end}/${s.size}`}}headers['Content-Length']=end-start+1;res.writeHead(code,headers);fs.createReadStream(file,{start,end}).pipe(res)})
}).listen(port,'127.0.0.1',()=>console.log('RushFinder 0813: http://127.0.0.1:'+port+'/index.html'));
