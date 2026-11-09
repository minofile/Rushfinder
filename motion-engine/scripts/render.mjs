import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const here = path.dirname(fileURLToPath(import.meta.url));
const engineRoot = path.resolve(here, '..');
const entryPoint = path.join(engineRoot, 'src', 'remotion', 'index.ts');
const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Usage: npm run render -- "C:\\path\\to\\RushFinder-Remotion-Project.json"');
  process.exit(2);
}
const projectPath = path.resolve(inputFile);
if (!fs.existsSync(projectPath)) {
  console.error('Project JSON not found:', projectPath);
  process.exit(2);
}
let project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
if (project?.plan) project = project.plan;
if (!Array.isArray(project?.scenes) || !project.scenes.length) {
  console.error('Invalid project: expected { projectTitle, scenes: [...] }.');
  process.exit(2);
}
const inputProps = { plan: project };
const output = path.resolve(engineRoot, '..', 'RushFinder-Remotion-Output.mp4');
console.log('Bundling Remotion composition...');
const serveUrl = await bundle({ entryPoint, onProgress: (p) => process.stdout.write(`\\rBundle ${Math.round(p*100)}%`) });
console.log('\\nSelecting composition...');
const composition = await selectComposition({ serveUrl, id: 'DocumentaryMotion', inputProps });
console.log(`Rendering ${composition.durationInFrames} frames at ${composition.fps} fps...`);
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: output,
  inputProps,
  pixelFormat: 'yuv420p',
  crf: 18,
  concurrency: Math.max(1, Math.min(8, Math.floor(os.cpus().length / 2) || 1)),
  onProgress: ({ progress }) => process.stdout.write(`\\rRender ${Math.round(progress*100)}%`)
});
console.log('\\nDone:', output);
