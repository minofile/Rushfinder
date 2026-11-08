@echo off
setlocal
cd /d "%~dp0"
echo RushFinder 0948 — Publish documentary motion engine
where git >nul 2>nul
if errorlevel 1 (
 echo ERROR: Git is not installed.
 pause
 exit /b 1
)
if not exist .git (
 echo ERROR: Put these files in the main Rushfinder GitHub repository folder.
 pause
 exit /b 1
)
if not exist motion-documentary-engine.js (
 echo ERROR: New renderer file is missing.
 pause
 exit /b 1
)
REM Only stage reviewed code/docs. Never stage local secrets, backups or credentials.
git add -- smart-edit.html smart-edit.js claude-motion-editor.js motion-documentary-engine.js api/chat.js README-0948-DOCUMENTARY-MOTION-FA.md PUBLISH-0948-GITHUB.cmd
if errorlevel 1 (
 echo ERROR: Could not stage files.
 pause
 exit /b 1
)
git diff --cached --quiet
if errorlevel 1 (
 git commit -m "RushFinder 0948 editable documentary motion engine"
 if errorlevel 1 (
  echo ERROR: Commit failed.
  pause
  exit /b 1
 )
) else (
 echo No new changes; checking remote push.
)
git push origin main
if errorlevel 1 (
 echo ERROR: Push failed. Check terminal output.
 pause
 exit /b 1
)
echo Push complete. Check Vercel Deployments for Ready.
pause
