/* RushFinder 0948 — procedural documentary motion renderer.
 * Each frame is drawn from editable scene parameters, with no flattened video.
 * Visual diagrams and maps are schematic, not verified geographical/statistical data.
 */
(()=>{'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
const validColor=s=>/^#[\da-f]{6}$/i.test(s||'');
const font='RushVazir0923, Vazir, Tahoma, sans-serif';
function round(ctx,x,y,w,h,r=13){const z=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+z,y);ctx.arcTo(x+w,y,x+w,y+h,z);ctx.arcTo(x+w,y+h,x,y+h,z);ctx.arcTo(x,y+h,x,y,z);ctx.arcTo(x,y,x+w,y,z);ctx.closePath()}
function fill(ctx,x,y,w,h,r,color){ctx.fillStyle=color;round(ctx,x,y,w,h,r);ctx.fill()}
function stroke(ctx,x,y,w,h,r,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;round(ctx,x,y,w,h,r);ctx.stroke()}
function lines(ctx,value,width,max=3){const result=[];let line='';for(const word of String(value||'').split(/\s+/).filter(Boolean)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){result.push(line);line=word}else line=next;if(result.length>=max)break}if(line&&result.length<max)result.push(line);return result.slice(0,max)}
function text(ctx,value,x,y,size,color,width=850,maxLines=2,weight='bold',align='center'){
 ctx.save();ctx.fillStyle=color;ctx.textAlign=align;ctx.direction='rtl';ctx.font=`${weight} ${size}px ${font}`;
 const ls=lines(ctx,value,width,maxLines);ls.forEach((l,i)=>ctx.fillText(l,x,y+i*size*1.48));ctx.restore();return ls.length;
}
function stripe(ctx,c,x,y,w,h){ctx.save();ctx.fillStyle=c;ctx.fillRect(x,y,w,h);ctx.restore()}
function line(ctx,x,y,xx,yy,color,width=4){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function dot(ctx,x,y,r,col){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill()}
function geometricMap(ctx,accent,advance,time){
 // A stylized route diagram; do not represent this as a surveyed/geographic border.
 const contours=[[[170,264],[310,198],[434,231],[518,185],[640,235],[629,300],[745,325],[677,405],[538,390],[473,460],[331,411],[250,444],[178,367]],[[220,470],[302,491],[372,470],[405,518],[363,550],[267,539]],[[690,185],[757,145],[822,161],[851,214],[802,245]]];
 ctx.save();ctx.beginPath();ctx.rect(90,137,825,472);ctx.clip();
 for(let i=0;i<contours.length;i++){
  const pts=contours[i];ctx.beginPath();pts.forEach((p,j)=>j?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=i?'#223349bb':'#253b51dd';ctx.fill();ctx.strokeStyle='#a9bed34b';ctx.lineWidth=2;ctx.stroke();
 }
 for(let i=0;i<16;i++){let x=145+i*47;line(ctx,x,145,x+58,590,'#b9d1e213',1)}
 const route=[[250,385],[407,323],[574,360],[721,263]];
 ctx.setLineDash([11,11]);ctx.lineDashOffset=-time*22;ctx.beginPath();route.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.stroke();ctx.setLineDash([]);
 route.forEach((p,i)=>{const reveal=ease(advance*1.2-i*.12);if(!reveal)return;dot(ctx,...p,10*reveal,accent);dot(ctx,...p,4*reveal,'#fff')});
 const k=Math.floor(clamp(advance,0,.999)*3);const p=route[k],q=route[Math.min(k+1,3)],u=(advance*3-k);dot(ctx,p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,15,'#ffffff');
 ctx.restore();
}
function stats(ctx,accent,advance,seconds,scene){
 // No invented numerical values: default bars are explicitly illustrative.
 const bars=[.35,.49,.41,.67,.57,.84];const bx=159,by=550,bw=106,g=23,max=300;
 for(let i=0;i<bars.length;i++){
  const y=ease(clamp(advance*1.65-i*.115,0,1)),bh=max*bars[i]*y;
  const grad=ctx.createLinearGradient(0,by-bh,0,by);grad.addColorStop(0,accent);grad.addColorStop(1,'#223a58');
  fill(ctx,bx+i*(bw+g),by-bh,bw,bh,7,grad);
  dot(ctx,bx+bw/2+i*(bw+g),by-bh,4,'#d8eeff');
 }
 line(ctx,140,558,935,558,'#b9cde18c',3);
 const metric=String(scene.metric||'').trim();
 if(metric){fill(ctx,930,240,270,145,20,'#141e32e8');text(ctx,metric,1065,322,65,'#ffffff',244,1,'900');}
 else{text(ctx,'نمودار نمایشی',1064,313,27,'#d2e7f6',230,2);}
}
function timeline(ctx,accent,p,scene){
 const stops=4,y=490,st=170,gap=285;
 line(ctx,st,y,st+(stops-1)*gap,y,'#597996',11);
 line(ctx,st,y,st+(stops-1)*gap*ease(p),y,accent,11);
 const years=Array.isArray(scene.milestones)?scene.milestones.filter(x=>/^\d{3,4}$/.test(String(x))).slice(0,4):[];
 for(let i=0;i<stops;i++){
  const x=st+i*gap,visible=ease(p*1.55-i*.25);
  dot(ctx,x,y,23*visible,'#13253d');dot(ctx,x,y,13*visible,visible>0?accent:'#2d4e6c');
  if(visible>.1){text(ctx,years[i]||('مرحله '+(i+1)),x,y-43-(1-visible)*12,26,'#f6faff',180,1)}
  if(i<3)line(ctx,x,y+35,x,y+66,'#647f98a6',2);
 }
 text(ctx,'خط زمانی رویدادها',650,295,33,'#dfe8f4',540,2);
}
function document(ctx,accent,p,scene){
 ctx.save();ctx.translate(0,(1-ease(p)) * 80);ctx.globalAlpha=ease(p);
 fill(ctx,188,245,885,340,23,'#e7ebee');fill(ctx,210,265,843,300,10,'#f8f8f7');
 fill(ctx,238,290,130,16,3,accent);
 for(let i=0;i<7;i++)stripe(ctx,i===0?'#415065':'#a4abb5',238,332+i*27,635-(i%3)*90,6);
 fill(ctx,875,292,142,185,6,'#c9d1d8');
 ctx.fillStyle='#8899a7';ctx.beginPath();ctx.arc(946,347,28,0,7);ctx.fill();
 line(ctx,895,435,1000,435,'#8d9da8',3);ctx.restore();
 text(ctx,scene.caption||'سند و روایت تاریخی',638,623,25,'#d8e3f0',740,1);
}
function quote(ctx,accent,p,scene){
 const q=ease(p);ctx.save();ctx.translate(0,(1-q)*55);ctx.globalAlpha=q;
 fill(ctx,116,190,1047,346,27,'#0d1629eb');stripe(ctx,115,201,11,328,accent);
 text(ctx,'❝',230,300,119,accent,200,1);
 text(ctx,scene.caption||scene.visual||'متن روایت',670,359,45,'#ffffff',815,3,'bold');
 stripe(ctx,450,478,395,4,accent);ctx.restore();
}
function intro(ctx,accent,p,scene){
 const e=ease(p),tx=120+(1-e)*110;
 fill(ctx,102,160,1076,400,26,'#0d1528bf');
 ctx.save();ctx.globalAlpha=e;ctx.translate(tx-120,0);
 stripe(ctx,128,192,11,335,accent);
 text(ctx,scene.caption||'روایت تصویری',672,347,49,'#f7f9fd',850,2);
 text(ctx,scene.location||'گزارش مستند',672,436,28,'#cbd8e4',800,1,'normal');
 ctx.restore();
}
function titlePlate(ctx,accent,type,scene){
 const typelabel={map:'نقشه رویدادها',data:'آمار و تحلیل',timeline:'خط زمان',quote:'نقل‌قول',closing:'جمع‌بندی',title:'روایت مستند'}[type]||'روایت مستند';
 fill(ctx,64,51,280,43,9,accent);text(ctx,typelabel,202,82,24,'#ffffff',246,1);
 stripe(ctx,65,108,1076,2,'#ffffff32');
 text(ctx,'RUSHFINDER • DOCUMENTARY',1154,688,18,'#b9cada',600,1,'normal','right');
 if(type==='map')text(ctx,'نقشه شماتیک | موقعیت‌ها و مسیرها نیازمند تأیید',610,650,19,'#dbe7f6',880,1,'normal');
 if(type==='data'&&!scene.metric)text(ctx,'نمودار صرفاً نمایشی است؛ داده واقعی وارد نشده',615,652,19,'#dbe7f6',880,1,'normal');
}
function draw({ctx,canvas,scene,elapsed=0,duration=5,opacity=1}){
 if(!scene||!ctx)return;
 const W=canvas.width,H=canvas.height;
 const type=['title','data','map','timeline','quote','closing','document'].includes(scene.type)?scene.type:'title';
 const accent=validColor(scene.accent)?scene.accent:'#e34a4f';
 const style=scene.style||'documentary';
 const p=clamp(elapsed/Math.max(.5,duration),0,1),enter=ease(elapsed/1.2),leave=ease((duration-elapsed)/.48);
 ctx.save();ctx.scale(W/1280,H/720);ctx.globalAlpha=opacity*enter*leave;
 const shade=style==='minimal'?'#111e30':style==='energetic'?'#211022':'#0b1726';
 fill(ctx,28,25,1224,671,21,shade+'d9');
 const grad=ctx.createRadialGradient(920,314,40,920,314,610);
 grad.addColorStop(0,accent+'38');grad.addColorStop(1,'#00000000');ctx.fillStyle=grad;ctx.fillRect(28,25,1224,670);
 for(let i=0;i<22;i++)line(ctx,70+i*53,140,48+i*53,630,'#a4bfdb12',1);
 for(let i=0;i<9;i++)line(ctx,70,145+i*58,1210,145+i*58,'#a4bfdb0e',1);
 for(let i=0;i<75;i++){const x=65+((i*137)%1140),y=130+((i*83)%520);dot(ctx,x,y,(i%3===0?2:1),'#ffffff20')}
 titlePlate(ctx,accent,type,scene);
 switch(type){case 'map':geometricMap(ctx,accent,enter,elapsed);break;
 case 'data':stats(ctx,accent,enter,duration,scene);break;
 case 'timeline':timeline(ctx,accent,enter,scene);break;
 case 'quote':quote(ctx,accent,enter,scene);break;
 case 'document':document(ctx,accent,enter,scene);break;
 default:intro(ctx,accent,enter,scene);}
 if(scene.location&&type==='map'){fill(ctx,897,243,278,115,16,'#13283edb');text(ctx,scene.location,1031,316,37,'#f7fafc',235,2);}
 ctx.restore();
}
function drawHeading({ctx,canvas,title,scene,elapsed=0,duration=5}){
 if(!title||!ctx)return;
 const W=canvas.width,H=canvas.height,accent=validColor(scene?.accent)?scene.accent:'#e34a4f';
 const u=ease(elapsed/.75),exit=ease((duration-elapsed)/.36),alpha=u*exit;
 const pos=clamp(Number(scene?.titleY)||0.24,.12,.72);
 ctx.save();ctx.scale(W/1280,H/720);ctx.globalAlpha=alpha;
 ctx.translate((1-u)*-85,0);
 const y=720*pos;
 fill(ctx,141,y-63,1000,120,13,'#101827e8');fill(ctx,141,y-63,12,120,2,accent);
 text(ctx,title,641,y+7,48*(clamp(Number(scene?.fontScale)||1,.7,1.3)),'#ffffff',880,2);
 ctx.restore();
}
window.RFMotionRenderer={draw,drawHeading,version:'0948',types:['title','data','map','timeline','quote','document','closing']};
})();
