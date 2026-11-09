RushFinder 0958 - Hide the two circled Hermes UI elements

1) Extract this ZIP.
2) Copy FIX-0958.ps1 and PUBLISH-0958-HIDE-HERMES.cmd into the existing local RushFinder Git folder, beside smart-edit.html.
3) Double-click PUBLISH-0958-HIDE-HERMES.cmd.
4) Confirm the latest Vercel deployment is READY, then refresh RushFinder with Ctrl+F5.

This patch changes the EXISTING smart-edit.html and does not replace it with an older file.
It hides the Hermes title, unconnected send button, status, actions, note and access code form.
The narration text input, audio picker, timeline, export, AI tools, and backend code remain untouched.
The removed UI controls are not removed from the DOM, because JS depends on their IDs.
This patch does not connect Hermes, and cannot bypass a failed Vercel build.
If Vercel shows Error, open the deployment's Build Logs for the actual error.
