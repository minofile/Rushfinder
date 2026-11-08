# RushFinder 0942 — Claude Motion Editor

- Set `ANTHROPIC_API_KEY` in Vercel Production.
- Optional: `SMARTEDIT_CLAUDE_MODEL` (default `claude-sonnet-4-5`).
- Deploy to Vercel, then open SmartEdit. Enter narration/script, choose style and duration, click “طراحی و چیدن صحنه‌ها”, review storyboard, then “ذخیره سناریو” to add scenes to the editable timeline.
- Export is manual using the existing Export button.
- This initial implementation generates editable graphic scene cards and title overlays. It does not synthesize stock footage or fully recreate a Premiere-grade multitrack editor. Imported narration/media remains local to the browser.
- Do not commit local secret files. The ZIP intentionally excludes `vecteezy-worker-secret.local.txt`.
