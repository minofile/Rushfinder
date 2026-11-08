@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo RushFinder 0940 - Fix missing AI Failover module
where git >nul 2>&1
if errorlevel 1 (
 echo ERROR: Git was not found.
 pause
 exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
 echo ERROR: Extract this patch into your EXISTING Rushfinder GitHub project folder.
 pause
 exit /b 1
)
if not exist "lib\ai-failover.mjs" (
 echo ERROR: lib\ai-failover.mjs is missing - patch extracted into wrong folder.
 pause
 exit /b 1
)
if not exist "lib\vecteezy.mjs" (
 echo ERROR: lib\vecteezy.mjs is missing.
 pause
 exit /b 1
)
if not exist "api\youtube-music.js" (
 echo ERROR: api\youtube-music.js is missing.
 pause
 exit /b 1
)
if not exist "api\chat.js" (
 echo ERROR: api\chat.js is missing.
 pause
 exit /b 1
)
where node >nul 2>&1
if not errorlevel 1 (
 node --check "lib\ai-failover.mjs"
 if errorlevel 1 (echo ERROR: Invalid ai-failover module. & pause & exit /b 1)
 node --check "lib\vecteezy.mjs"
 if errorlevel 1 (echo ERROR: Invalid Vecteezy module. & pause & exit /b 1)
 node --check "api\youtube-music.js"
 if errorlevel 1 (echo ERROR: Invalid youtube-music API. & pause & exit /b 1)
 node --check "api\chat.js"
 if errorlevel 1 (echo ERROR: Invalid chat API. & pause & exit /b 1)
)
echo Staging ALL API dependencies (0939 publisher omitted ai-failover.mjs).
git add -- lib/ai-failover.mjs lib/vecteezy.mjs api/youtube-music.js api/chat.js PUBLISH-0940-FIX-GITHUB.cmd README-0940-FIX-FA.md
if errorlevel 1 (echo ERROR: Failed to stage files. & pause & exit /b 1)
git ls-files --error-unmatch lib/ai-failover.mjs >nul 2>&1
if errorlevel 1 (echo ERROR: AI module not tracked by Git. & pause & exit /b 1)
git diff --cached --quiet -- lib/ai-failover.mjs lib/vecteezy.mjs api/youtube-music.js api/chat.js PUBLISH-0940-FIX-GITHUB.cmd README-0940-FIX-FA.md
if not errorlevel 1 (
 echo No new changes for the selected files. Checking remote push...
 git push
 if errorlevel 1 (echo ERROR: Git push failed. & pause & exit /b 1)
 echo No new commit required. Check GitHub: lib/ai-failover.mjs should exist on deployment branch.
 pause
 exit /b 0
)
git commit --only -m "RushFinder 0940: deploy required AI failover module" -- lib/ai-failover.mjs lib/vecteezy.mjs api/youtube-music.js api/chat.js PUBLISH-0940-FIX-GITHUB.cmd README-0940-FIX-FA.md
if errorlevel 1 (echo ERROR: Commit failed. & pause & exit /b 1)
git push
if errorlevel 1 (echo ERROR: Git push failed. & pause & exit /b 1)
echo SUCCESS: Files pushed, including lib/ai-failover.mjs.
echo Wait for Vercel Production READY and refresh RushFinder with Ctrl+F5.
pause
