import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import { DocumentaryMotion } from './remotion/DocumentaryMotion';
import { DEMO_PLAN, FPS, MotionPlan, MotionScene, normalizeMotionPlan, planFrames, sceneFrames } from './remotion/types';

const source = 'rushfinder-remotion';
const sendParent = (type:string, plan?:MotionPlan) => {
  if (window.parent !== window) window.parent.postMessage({source,type,plan}, window.location.origin);
};

export const MotionStudio: React.FC = () => {
  const [plan,setPlan] = useState<MotionPlan>(()=>normalizeMotionPlan(DEMO_PLAN));
  const [selected,setSelected] = useState(0);
  const [revision,setRevision] = useState(0);
  const playerRef = useRef<any>(null);
  const selectedScene = plan.scenes[selected] || plan.scenes[0];
  const totalFrames = useMemo(()=>planFrames(plan),[plan,revision]);
  const totalSeconds = (totalFrames/FPS).toFixed(1);

  useEffect(()=>{
    const onMessage=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin || event.data?.source!=='rushfinder-host') return;
      if(event.data.type==='request-ready'){sendParent('ready');return;}
      if(event.data.type==='load-plan' && event.data.plan){
        const next=normalizeMotionPlan(event.data.plan);
        setPlan(next);setSelected(v=>Math.min(v,Math.max(0,next.scenes.length-1)));setRevision(v=>v+1);
        sendParent('plan-loaded',next);
      }
    };
    window.addEventListener('message',onMessage);
    sendParent('ready');
    return ()=>window.removeEventListener('message',onMessage);
  },[]);

  const updateScene=(patch:Partial<MotionScene>)=>{
    const next=normalizeMotionPlan({...plan,scenes:plan.scenes.map((scene,i)=>i===selected?{...scene,...patch}:scene)});
    setPlan(next);sendParent('plan-updated',next);setRevision(v=>v+1);
  };

  const seekScene=(index:number)=>{
    const frame=plan.scenes.slice(0,index).reduce((sum,s)=>sum+sceneFrames(s),0);
    playerRef.current?.seekTo(frame);
    setSelected(index);
  };

  const moveScene=(delta:number)=>{
    const nextIndex=selected+delta;
    if(nextIndex<0||nextIndex>=plan.scenes.length)return;
    const scenes=[...plan.scenes];const [item]=scenes.splice(selected,1);scenes.splice(nextIndex,0,item);
    const next=normalizeMotionPlan({...plan,scenes});
    setPlan(next);sendParent('plan-updated',next);
    setSelected(nextIndex);setRevision(v=>v+1);
  };

  const downloadProject=()=>{
    const blob=new Blob([JSON.stringify(plan,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download='RushFinder-Remotion-Project.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  };

  return <div className="studio" dir="rtl">
    <header className="topbar">
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span className="brand">استودیوی موشن مستند</span>
        <span className="engine">REMOTION ENGINE</span>
      </div>
      <div className="actions">
        <button className="btn" onClick={()=>{const demo=normalizeMotionPlan(DEMO_PLAN);setPlan(demo);setSelected(0);setRevision(v=>v+1);sendParent('plan-updated',demo)}}>نمونه آزمایشی</button>
        <button className="btn primary" onClick={downloadProject}>ذخیره پروژه JSON</button>
      </div>
    </header>
    <main className="main">
      <section className="playerWrap">
        <Player
          ref={playerRef}
          component={DocumentaryMotion}
          inputProps={{plan}}
          durationInFrames={totalFrames}
          fps={FPS}
          compositionWidth={1920}
          compositionHeight={1080}
          controls
          clickToPlay
          spaceKeyToPlay
          style={{width:'100%',height:'100%'}}
          moveToBeginningWhenEnded
        />
      </section>
      <section className="timeline">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:9,color:'#9eb2c9',marginBottom:6}}>
          <span>تایم‌لاین صحنه‌ها · انتخاب هر بخش برای ویرایش</span>
          <span>{plan.scenes.length} صحنه · {totalSeconds} ثانیه</span>
        </div>
        <div className="track">
          {plan.scenes.map((scene,i)=><button
            key={scene.id||i}
            className={'segment '+(selected===i?'active':'')}
            style={{flex:`${Math.max(2,scene.duration)} 1 0`}}
            onClick={()=>seekScene(i)}
            title={scene.title}
          >{i+1}. {scene.title}</button>)}
        </div>
      </section>
      <section className="editor">
        {selectedScene ? <>
          <div className="field">
            <label>عنوان صحنه</label>
            <input value={selectedScene.title} onChange={e=>updateScene({title:e.target.value})}/>
          </div>
          <div className="field">
            <label>نوع صحنه</label>
            <select value={selectedScene.type} onChange={e=>updateScene({type:e.target.value as MotionScene['type']})}>
              <option value="title">عنوان سینمایی</option><option value="data">داده و نمودار</option>
              <option value="map">نقشه متحرک</option><option value="timeline">خط زمانی</option>
              <option value="quote">نقل‌قول</option><option value="closing">پایان‌بندی</option>
            </select>
          </div>
          <div className="field">
            <label>مدت (ثانیه)</label>
            <input type="number" min="2" max="30" value={selectedScene.duration} onChange={e=>updateScene({duration:Math.max(2,Math.min(30,Number(e.target.value)||2))})}/>
          </div>
          <div className="field wide">
            <label>توضیح بصری / محتوای صحنه</label>
            <textarea value={selectedScene.visual||''} onChange={e=>updateScene({visual:e.target.value})}/>
          </div>
          <div className="field wide">
            <label>لینک تصویر آرشیوی (اختیاری)</label>
            <input value={selectedScene.imageUrl||''} placeholder="https://..." onChange={e=>updateScene({imageUrl:e.target.value})}/>
          </div>
          <div className="field">
            <label>رنگ تأکیدی</label>
            <input type="color" value={selectedScene.accent||'#d94a4a'} onChange={e=>updateScene({accent:e.target.value})}/>
          </div>
          <div className="field">
            <label>حرکت</label>
            <select value={selectedScene.motion||'slow-zoom'} onChange={e=>updateScene({motion:e.target.value})}>
              <option value="slow-zoom">زوم نرم</option><option value="draw-line">ترسیم خط</option>
              <option value="route-reveal">نمایش مسیر</option><option value="bar-rise">رشد نمودار</option>
              <option value="type-on">ورود تایپی</option><option value="fade">محو تدریجی</option>
            </select>
          </div>
        </> : <div className="empty">هنوز صحنه‌ای وجود ندارد.</div>}
      </section>
      <div style={{display:'flex',gap:6,justifyContent:'flex-start'}}>
        <button className="btn" onClick={()=>moveScene(-1)} disabled={selected<=0}>انتقال به چپ</button>
        <button className="btn" onClick={()=>moveScene(1)} disabled={selected>=plan.scenes.length-1}>انتقال به راست</button>
      </div>
    </main>
    <footer className="footer">
      <span>ویرایش‌ها به تایم‌لاین RushFinder برگردانده می‌شوند.</span>
      <span>خروجی Remotion: با فایل JSON و اسکریپت رندر محلی</span>
    </footer>
  </div>;
};
