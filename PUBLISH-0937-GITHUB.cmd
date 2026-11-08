@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo RushFinder 0937 - Publish exact updated files to GitHub
where git >nul 2>&1 || (echo Git is not installed. & pause & exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>&1 || (echo ERROR: Put this release INSIDE your Rushfinder GitHub project folder, not Downloads. & pause & exit /b 1)
git add -- api/youtube-music.js smart-autocut.js smart-edit.html smart-edit.js smart-youtube.js vercel.json RUN-0934-MEDIA-WORKER.cmd tools/rf_media_worker.py README-0937-FA.md RUN-0937-MEDIA-WORKER.cmd PUBLISH-0937-GITHUB.cmd tests/test-0934-api.mjs tests/test-0937-autocut.mjs tests/test-0937-gemini.mjs tests/test-0937-partial-worker.py
if errorlevel 1 (echo ERROR: Cannot stage files. & pause & exit /b 1)
git diff --cached --quiet
if not errorlevel 1 (
  echo No new staged changes. Checking Git remote...
  git push
  pause
  exit /b %errorlevel%
)
git commit -m "RushFinder 0937: stable Gemini auto cut, local video worker, fallback"
if errorlevel 1 (echo Commit error - no changes pushed. & pause & exit /b 1)
git push
if errorlevel 1 (echo Push failed - inspect GitHub login or remote branch. & pause & exit /b 1)
echo SUCCESS. GitHub update sent. Wait for a successful Vercel deployment before using the site.
pause
