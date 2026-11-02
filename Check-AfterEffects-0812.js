'use strict';
// Run on the same Windows machine as Adobe After Effects; no cloud or network needed.
const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const base=path.join(os.homedir(),'RushFinder-Cache');
fs.mkdirSync(base,{recursive:true});
const stamp=new Date().toISOString();
const reportFile=path.join(base,'AE-Diagnostic-0812.txt');
const jsxPath=path.join(base,'rushfinder-smoke-test.jsx');
const flag=path.join(base,'AE-SCRIPT-OK-0812.txt');
function line(s){ const t='['+new Date().toISOString()+'] '+s;console.log(t);fs.appendFileSync(reportFile,t+'\n','utf8');}
function aeExe(){
 const preferred=process.env.RUSHFINDER_AFTERFX;
 if(preferred && fs.existsSync(preferred))return preferred;
 const bases=[process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean);
 for(const b of bases){
  const adobe=path.join(b,'Adobe');
  if(!fs.existsSync(adobe))continue;
  for(const d of fs.readdirSync(adobe).filter(x=>/^Adobe After Effects/i.test(x)).sort().reverse()){
   const f=path.join(adobe,d,'Support Files','AfterFX.exe');
   if(fs.existsSync(f))return f;
  }
 }
 return null;
}
line('Checking Adobe automation 0812.');
const exe=aeExe();
if(!exe){line('ERROR: AfterFX.exe not found. Set RUSHFINDER_AFTERFX or install After Effects.');process.exit(2);}
line('AfterFX.exe: '+exe);
const aerender=path.join(path.dirname(exe),'aerender.exe');
line('aerender.exe: '+(fs.existsSync(aerender)?'Found':'MISSING'));
try{fs.unlinkSync(flag)}catch{}
const safeFlag=JSON.stringify(flag.replace(/\\/g,'/'));
const jsx="(function(){var f=new File("+safeFlag+");if(!f.open('w'))throw Error('Cannot write diagnostic marker: '+f.error);f.write('AE_SCRIPT_EXECUTED');f.close();try{app.exitAfterLaunchAndEval=true;}catch(e){}})();";
fs.writeFileSync(jsxPath,'\uFEFF'+jsx,'utf8');
line('JSX probe: '+jsxPath);
const args=['-m','-noui','-r',jsxPath];
line('Start isolated AfterFX.exe -m -noui -r (no changes to user project)');
let spawned=null;
try{spawned=cp.spawn(exe,args,{windowsHide:true,stdio:['ignore','pipe','pipe']})}
catch(e){line('ERROR starting AE: '+e.message);process.exit(3)}
spawned.stdout.on('data',b=>line('stdout: '+b.toString().slice(0,500)));
spawned.stderr.on('data',b=>line('stderr: '+b.toString().slice(0,500)));
spawned.on('error',e=>line('AE process error: '+e.message));
let sec=0;
const tick=setInterval(()=>{
 sec+=1;
 if(fs.existsSync(flag)){
  clearInterval(tick);
  line('SUCCESS: Real installed After Effects executed JSX and wrote marker. Now test from index.html.');
  line('Report saved at '+reportFile);
  process.exit(0);
  return;
 }
 if(sec>=100){
  clearInterval(tick);
  line('FAILED: No JSX marker after 100 seconds. After Effects did not execute the command, or script file writing is disabled.');
  line('Open After Effects > Edit > Preferences > Scripting & Expressions > Allow Scripts To Write Files And Access Network.');
  line('If this persists, manually run the JSX from File > Scripts > Run Script File to get the exact Adobe error.');
  line('Report saved at '+reportFile);
  process.exit(4);
 }
},1000);
