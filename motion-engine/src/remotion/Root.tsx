import React from 'react';
import { Composition } from 'remotion';
import { DocumentaryMotion, DEMO_PLAN, FPS, planFrames, normalizeMotionPlan } from './DocumentaryMotion';

const Root: React.FC = () => (
  <Composition
    id="DocumentaryMotion"
    component={DocumentaryMotion}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={planFrames(DEMO_PLAN)}
    defaultProps={{ plan: DEMO_PLAN }}
    calculateMetadata={({ props }) => {
      const plan = normalizeMotionPlan((props as any).plan);
      return { durationInFrames: planFrames(plan), fps: FPS, width: 1920, height: 1080 };
    }}
  />
);

export default Root;
