export type MotionSceneType = 'title' | 'data' | 'map' | 'timeline' | 'quote' | 'closing';
export type MotionScene = {
  id?: string;
  sceneIndex?: number;
  title: string;
  visual?: string;
  duration: number;
  type: MotionSceneType;
  motion?: string;
  narration?: string;
  accent?: string;
  imageUrl?: string;
  subtitle?: string;
};
export type MotionPlan = {
  projectTitle: string;
  style?: string;
  scenes: MotionScene[];
};
export const DEMO_PLAN: MotionPlan = {
  projectTitle: 'انقلاب فرانسه؛ از اعتراض تا دگرگونی',
  style: 'documentary',
  scenes: [
    {id:'demo-1', title:'فرانسه در آستانه دگرگونی', subtitle:'روایت یک انقلاب تاریخی', visual:'جامعه‌ای در آستانه تغییر؛ تنش میان مردم و ساختار سلطنت', duration:5, type:'title', motion:'slow-zoom', accent:'#d94a4a', narration:'فرانسه در آستانه یکی از بزرگ‌ترین دگرگونی‌های تاریخ خود قرار داشت.'},
    {id:'demo-2', title:'۱۷۸۹؛ آغاز یک تحول', subtitle:'نقطه عطف تاریخی', visual:'اعتراض‌ها و شکل‌گیری جنبش مردمی در پاریس', duration:6, type:'timeline', motion:'draw-line', accent:'#d94a4a', narration:'در سال ۱۷۸۹، اعتراض‌ها به نقطه‌ای سرنوشت‌ساز رسید.'},
    {id:'demo-3', title:'سقوط نماد سلطنت', subtitle:'زندان باستیل', visual:'یورش مردم به باستیل و شکستن نماد قدرت سلطنتی', duration:6, type:'map', motion:'route-reveal', accent:'#e6b65c', narration:'سقوط باستیل به نمادی از فروپاشی اقتدار سلطنت تبدیل شد.'},
    {id:'demo-4', title:'حقوق شهروندی در کانون توجه', subtitle:'اعلامیه حقوق بشر و شهروند', visual:'مفاهیم آزادی، برابری و حقوق شهروندی', duration:6, type:'quote', motion:'type-on', accent:'#d94a4a', narration:'مفاهیم آزادی و برابری به مرکز گفت‌وگوی سیاسی تبدیل شدند.'},
    {id:'demo-5', title:'دگرگونی ساختار قدرت', subtitle:'از سلطنت تا جمهوری', visual:'تغییر ساختار سیاسی و جابه‌جایی قدرت', duration:6, type:'data', motion:'bar-rise', accent:'#d94a4a', narration:'ساختار قدرت در فرانسه دستخوش تغییرات بنیادین شد.'},
    {id:'demo-6', title:'انقلابی با پیامدهای جهانی', subtitle:'پایان یک فصل؛ آغاز فصلی دیگر', visual:'میراث سیاسی و اجتماعی انقلاب در تاریخ جهان', duration:5, type:'closing', motion:'fade', accent:'#d94a4a', narration:'انقلاب فرانسه مسیر تاریخ سیاسی جهان را تحت تأثیر قرار داد.'}
  ]
};
export function normalizeMotionPlan(value: any): MotionPlan {
  const scenes = Array.isArray(value?.scenes) ? value.scenes.slice(0, 24) : [];
  const normalized = scenes.map((s: any, i: number) => ({
    id: String(s?.id || `scene-${i+1}`),
    sceneIndex: Number(s?.sceneIndex) || i+1,
    title: String(s?.title || `صحنه ${i+1}`).slice(0, 100),
    subtitle: String(s?.subtitle || '').slice(0, 100),
    visual: String(s?.visual || '').slice(0, 300),
    duration: Math.max(2, Math.min(30, Number(s?.duration) || 5)),
    type: (['title','data','map','timeline','quote','closing'].includes(s?.type) ? s.type : 'title') as MotionSceneType,
    motion: String(s?.motion || 'slow-zoom').slice(0, 80),
    narration: String(s?.narration || '').slice(0, 1000),
    accent: /^#[0-9a-fA-F]{6}$/.test(String(s?.accent || '')) ? String(s.accent) : '#d94a4a',
    imageUrl: /^https?:\/\//i.test(String(s?.imageUrl || '')) ? String(s.imageUrl) : ''
  }));
  return { projectTitle: String(value?.projectTitle || 'پروژه موشن‌گرافیک').slice(0, 120), style: String(value?.style || 'documentary'), scenes: normalized.length ? normalized : DEMO_PLAN.scenes };
}
export const FPS = 30;
export function sceneFrames(scene: MotionScene) { return Math.max(60, Math.round(scene.duration * FPS)); }
export function planFrames(plan: MotionPlan) { return plan.scenes.reduce((sum, scene) => sum + sceneFrames(scene), 0); }
