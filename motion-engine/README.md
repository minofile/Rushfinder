# RushFinder Remotion Engine

This folder contains the Remotion composition and the embedded React Player.

## Build the web Player
From the RushFinder root, run `BUILD-REMOTION-WEB.cmd`. It installs packages in this folder, runs Vite, writes the static Player to `../motion-studio-web`, and publishes the result to GitHub.

## Open Remotion Studio locally
```powershell
cd motion-engine
npm install
npm run studio
```

## Render a project to MP4
```powershell
cd motion-engine
npm install
npm run render -- demo-project.json
```
The renderer writes `RushFinder-Remotion-Output.mp4` in the RushFinder root.

The Player is a separate React app embedded into `smart-edit.html` through an iframe. Storyboards are passed with `postMessage`; the API key stays on the Vercel server and is not included in the browser app.
