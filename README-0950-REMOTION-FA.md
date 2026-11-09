# RushFinder Remotion Motion Studio (0950)

## What this adds
- A real Remotion composition (`motion-engine/src/remotion`) for documentary-style motion graphics.
- An embedded Remotion Player/scene editor at `/motion-studio-web/`.
- Scene editing for title, visual description, duration, type, accent color and motion preset.
- Parent bridge that sends generated storyboard plans into Remotion and mirrors scene edits back into the existing RushFinder timeline.
- Local MP4 rendering through Remotion Renderer. No Claude API key is required for the included demo storyboard.

## Important
This is a Remotion source integration. The ZIP contains source code and a placeholder web page. The compiled Player bundle is generated on the Windows project machine because npm dependencies are not vendored in this ZIP.

## Build and publish
1. Ensure Node.js and Git are installed. Node.js 22 LTS is the recommended version; if the current Node 26 installation builds successfully, it can be kept.
2. Extract/merge this ZIP into the existing RushFinder Git working folder.
3. Run `BUILD-REMOTION-WEB.cmd`.
4. It runs `npm install`, builds the Player into `motion-studio-web/`, then commits and pushes the changes.
5. Wait for Vercel Production to become Ready.
6. Open RushFinder Smart Edit, click `Remotion Studio`. A demo storyboard is available even before the Claude API is configured.

If npm cannot reach the registry, the build cannot complete. Do not push a half-built player; send the last 20 lines of the CMD output.

## Render MP4 locally
1. In Remotion Studio, click `ذخیره پروژه JSON`.
2. Drag the downloaded JSON file onto `RENDER-REMOTION.cmd`.
3. The output is `RushFinder-Remotion-Output.mp4` in the RushFinder root folder.

The browser's existing Export button still exports the legacy canvas timeline. For a Remotion-rendered MP4, use `RENDER-REMOTION.cmd` with the JSON project. To test without an API key, use `motion-engine/demo-project.json` as the input.

## API later
No Claude API key is required for the Remotion demo. When the API is ready, set `ANTHROPIC_API_KEY` in Vercel. The server-side motion storyboard route prefers Claude and falls back to Groq if Claude is not configured or fails.
