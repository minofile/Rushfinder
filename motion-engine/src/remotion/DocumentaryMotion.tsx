import './fonts.css';
import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import { MotionPlan, MotionScene, DEMO_PLAN, FPS, normalizeMotionPlan, planFrames, sceneFrames } from './types';

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v: number) => Easing.bezier(0.22, 1, 0.36, 1)(clamp(v));

const background = {
  position: 'absolute' as const,
  inset: 0,
  background: 'radial-gradient(ellipse at 76% 38%, #253449 0%, #101d2d 37%, #07101c 78%)'
};

const MapGraphic: React.FC<{frame:number; accent:string}> = ({frame,accent}) => {
  const progress = clamp(frame / 62);
  const points = [[140,180],[190,120],[250,150],[292,112],[342,168],[310,235],[260,258],[210,230],[160,250],[115,215]];
  const route = points.map((p,i)=>`${i===0?'M':'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z';
  const dash = 500 - progress * 500;
  return <svg viewBox="0 0 460 360" style={{width:'100%',height:'100%',overflow:'visible'}}>
    <defs>
      <linearGradient id="mapFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={accent} stopOpacity=".42"/><stop offset="1" stopColor="#e9eef5" stopOpacity=".04"/></linearGradient>
      <filter id="mapGlow"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <path d={route} fill="url(#mapFill)" stroke={accent} strokeWidth="2.5" strokeDasharray="7 8" opacity=".9"/>
    <path d="M 150 205 C 205 155 235 235 292 178 S 340 150 366 108" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="500" strokeDashoffset={dash} strokeLinecap="round"/>
    {[ [150,205],[292,178],[366,108] ].map(([x,y],i)=><g key={i}>
      <circle cx={x} cy={y} r={13+Math.sin(frame/7+i)*3} fill={accent} opacity=".22" filter="url(#mapGlow)"/>
      <circle cx={x} cy={y} r="6" fill={accent} stroke="#fff" strokeWidth="2"/>
    </g>)}
    <g fill="#b9c7d5" fontSize="12" fontFamily="Vazir, sans-serif"><text x="150" y="230">پاریس</text><text x="300" y="202">مسیر تحول</text></g>
  </svg>;
};

const DataGraphic: React.FC<{frame:number; accent:string; visual:string}> = ({frame,accent,visual}) => {
  const labels = ['۱','۲','۳','۴','۵'];
  const heights = [42,68,52,88,74];
  return <div style={{display:'flex',alignItems:'end',gap:20,height:'100%',padding:'30px 6% 12px',borderBottom:'1px solid #ffffff38',direction:'ltr'}}>
    {heights.map((h,i)=>{
      const p=clamp((frame-i*7)/42);
      return <div key={i} style={{flex:1,height:'100%',display:'flex',flexDirection:'column',justifyContent:'end',alignItems:'center',gap:12}}>
        <div style={{width:'100%',height:`${h*p}%`,minHeight:p>0?4:0,background:`linear-gradient(180deg,${accent},#f0b7a1)`,borderRadius:'7px 7px 0 0',boxShadow:`0 0 26px ${accent}55`,transition:'none'}}/>
        <span style={{color:'#aebdcd',fontSize:17}}>{labels[i]}</span>
      </div>;
    })}
  </div>;
};

const TimelineGraphic: React.FC<{frame:number; accent:string}> = ({frame,accent}) => {
  const p=clamp(frame/75);
  const nodes=[0,.25,.5,.75,1];
  return <div style={{position:'relative',width:'100%',height:180,marginTop:34}}>
    <div style={{position:'absolute',top:72,left:'8%',right:'8%',height:3,background:'#ffffff20',overflow:'hidden'}}>
      <div style={{height:'100%',width:`${p*100}%`,background:accent,boxShadow:`0 0 18px ${accent}`}}/>
    </div>
    {nodes.map((n,i)=><div key={i} style={{position:'absolute',left:`${8+n*84}%`,top:60,transform:'translateX(-50%)',opacity:clamp((frame-i*13)/16)}}>
      <div style={{width:24,height:24,borderRadius:99,background:accent,border:'4px solid #f3e6df',boxShadow:`0 0 24px ${accent}88`}}/>
      <div style={{color:'#e9edf2',fontSize:15,marginTop:15,whiteSpace:'nowrap'}}>رویداد {i+1}</div>
    </div>)}
  </div>;
};

const MotionScene: React.FC<{scene:MotionScene; index:number; frames:number}> = ({scene,index,frames}) => {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const accent=scene.accent || '#d94a4a';
  const enter=spring({frame, fps, config:{damping:20, stiffness:85, mass:.8}});
  const fade=interpolate(frame,[0,12,frames-14,frames],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const drift=interpolate(frame,[0,frames],[0,1],{extrapolateRight:'clamp'});
  const titleY=interpolate(enter,[0,1],[70,0]);
  const scale=interpolate(drift,[0,1],[1.04,1.12]);
  const isMap=scene.type==='map';
  const isData=scene.type==='data';
  const isTimeline=scene.type==='timeline';
  const isQuote=scene.type==='quote';
  const isClosing=scene.type==='closing';
  return <AbsoluteFill style={{background:'#07101c',color:'#f5f7fa',fontFamily:'Vazir, Tahoma, sans-serif',overflow:'hidden'}}>
    <AbsoluteFill style={{...background,opacity:fade}}/>
    {scene.imageUrl ? <AbsoluteFill style={{opacity:.22,transform:`scale(${scale})`}}><Img src={scene.imageUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/></AbsoluteFill> : null}
    <AbsoluteFill style={{opacity:.13,backgroundImage:'linear-gradient(rgba(255,255,255,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.09) 1px,transparent 1px)',backgroundSize:'80px 80px'}}/>
    <div style={{position:'absolute',top:0,right:0,width:'34%',height:'100%',background:`linear-gradient(135deg,${accent}18,transparent 70%)`,transform:`translateX(${(1-drift)*10}%)`}}/>
    <div style={{position:'absolute',top:70,left:92,right:92,height:2,background:'#ffffff26'}}>
      <div style={{height:2,width:`${drift*100}%`,background:accent,boxShadow:`0 0 18px ${accent}`}}/>
    </div>
    <div style={{position:'absolute',top:95,left:92,color:accent,fontSize:17,fontWeight:800,letterSpacing:2,direction:'ltr'}}>
      {String(index+1).padStart(2,'0')} <span style={{color:'#b6c0cc',fontWeight:500}}>/ DOCUMENTARY</span>
    </div>
    <div style={{position:'absolute',top:115,right:92,width:'42%',height:'72%',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'flex-start',direction:'rtl',opacity:fade}}>
      {scene.subtitle ? <div style={{fontSize:23,color:accent,fontWeight:700,marginBottom:24,transform:`translateY(${titleY*.5}px)`}}>{scene.subtitle}</div> : null}
      <div style={{fontSize:isClosing?76:68,fontWeight:900,lineHeight:1.34,maxWidth:'100%',textShadow:'0 12px 38px #0009',transform:`translateY(${titleY}px)`}}>{scene.title}</div>
      <div style={{width:150,height:6,background:accent,marginTop:34,boxShadow:`0 0 24px ${accent}88`,transform:`scaleX(${enter})`,transformOrigin:'right'}}/>
      {scene.visual ? <div style={{fontSize:25,lineHeight:1.9,color:'#c3ceda',marginTop:26,maxWidth:740,opacity:fade}}>{scene.visual}</div> : null}
    </div>
    <div style={{position:'absolute',left:70,top:140,width:'43%',height:'68%',display:'flex',alignItems:'center',justifyContent:'center',transform:`scale(${scale})`,opacity:fade}}>
      {isMap ? <MapGraphic frame={frame} accent={accent}/> :
       isData ? <DataGraphic frame={frame} accent={accent} visual={scene.visual||''}/> :
       isTimeline ? <TimelineGraphic frame={frame} accent={accent}/> :
       isQuote ? <div style={{fontSize:210,fontFamily:'Georgia,serif',color:accent,opacity:.72,transform:`translateY(${Math.sin(frame/13)*9}px)`}}>“</div> :
       isClosing ? <div style={{width:'75%',height:'75%',border:`2px solid ${accent}88`,borderRadius:8,display:'grid',placeItems:'center',background:`linear-gradient(145deg,${accent}22,transparent)`}}><div style={{fontSize:88,fontWeight:900,color:'#fff',textAlign:'center',lineHeight:1.2}}>{String(index+1).padStart(2,'0')}</div></div> :
       <div style={{position:'relative',width:'78%',height:'78%',border:'1px solid #ffffff28',borderRadius:8,overflow:'hidden',background:'linear-gradient(135deg,#ffffff0b,#ffffff02)'}}>
         <div style={{position:'absolute',inset:25,border:`1px solid ${accent}88`,transform:`rotate(${frame*.12}deg) scale(${.86+enter*.14})`}}/>
         <div style={{position:'absolute',left:'14%',right:'14%',top:'49%',height:3,background:accent,boxShadow:`0 0 30px ${accent}`}}/>
         <div style={{position:'absolute',left:'14%',top:'23%',width:'30%',height:9,background:'#ffffff77'}}/>
         <div style={{position:'absolute',right:'14%',bottom:'22%',width:'40%',height:9,background:accent,opacity:.65}}/>
       </div>}
    </div>
    <div style={{position:'absolute',bottom:76,left:92,right:92,display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #ffffff28',paddingTop:20,color:'#8e9cab',fontSize:15,direction:'rtl'}}>
      <span>{scene.narration ? 'همراه با نریشن' : 'موشن‌گرافیک مستند'}</span>
      <span style={{color:accent,fontWeight:800}}>{scene.type.toUpperCase()}</span>
    </div>
    <div style={{position:'absolute',inset:0,border:'1px solid #ffffff10',pointerEvents:'none'}}/>
  </AbsoluteFill>;
};

export const DocumentaryMotion: React.FC<{plan?:MotionPlan}> = ({plan}) => {
  const safe=normalizeMotionPlan(plan || DEMO_PLAN);
  let cursor=0;
  return <AbsoluteFill style={{background:'#07101c'}}>
    {safe.scenes.map((scene,index)=>{
      const frames=sceneFrames(scene);
      const from=cursor; cursor+=frames;
      return <Sequence key={scene.id || index} from={from} durationInFrames={frames}>
        <MotionScene scene={scene} index={index} frames={frames}/>
      </Sequence>;
    })}
  </AbsoluteFill>;
};

export { DEMO_PLAN, normalizeMotionPlan, planFrames, sceneFrames, FPS };
