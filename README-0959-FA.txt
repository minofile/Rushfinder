RushFinder 0959 — ONLY rename two text labels.

Changes:
  تدوین با Hermes  ->  تدوین
  ارسال درخواست به Hermes  ->  ارسال درخواست

This patch DOES NOT delete the Hermes connection, text box, audio input, or timeline.
It also restores the original submit button if it was hidden by 0957/0958.

1. Extract the ZIP into your actual RushFinder Git folder, beside smart-edit.html.
2. Double-click PUBLISH-0959-LABELS.cmd.
3. Confirm Vercel Deployments shows Ready, then Ctrl+F5.

If Vercel reports Error, open Build Logs; the publishing script cannot fix an unrelated deployment error.
Do not share API keys or passwords.
