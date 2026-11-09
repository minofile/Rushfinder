RushFinder 0953 - fix persistent #smart-edit in browser URL

WHY:
The editor navigation adds #smart-edit using history.replaceState, but other navigation buttons don't remove it. It persists as you navigate and can re-open the editor on reload.

FIX:
1) Stop adding #smart-edit when the editor button is clicked.
2) Preserve support for old #smart-edit bookmarks: open editor once, then clean address.
3) Do not change preview, editing, timeline, API calls, or other page routing.

INSTALL:
Extract ZIP, copy FIX-0953-URL-HASH.ps1 and PUBLISH-0953-FIX-URL.cmd into your existing RushFinder Git repository root (beside index.html), double-click PUBLISH-0953-FIX-URL.cmd.

The script edits your current index.html instead of copying an old version. It makes a backup in .rf-backups, and stages only index.html for its commit.
Requires Git and Windows PowerShell. No Claude or Remotion API needed.
