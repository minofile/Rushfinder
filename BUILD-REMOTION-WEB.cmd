@echo off
setlocal
title RushFinder - Build Remotion Motion Studio
cd /d "%~dp0"
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo Extract this patch into the existing RushFinder Git working folder first.
  pause
  exit /b 1
)
cd /d "%~dp0motion-engine"
if errorlevel 1 (
  echo [ERROR] motion-engine folder not found.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js (Node 22 LTS is recommended) first.
  pause
  exit /b 1
)
echo.
echo [1/3] Installing Remotion dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed. Check internet/proxy and try again.
  pause
  exit /b 1
)
echo.
echo [2/3] Building Remotion web player...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] Remotion build failed. Do not push yet.
  pause
  exit /b 1
)
cd /d "%~dp0"
node scripts\verify-remotion.mjs
if errorlevel 1 (
  echo [ERROR] Built Player is incomplete.
  pause
  exit /b 1
)
echo.
echo [3/3] Publishing source and built player to GitHub...
git add .github/workflows/build-remotion.yml scripts/verify-remotion.mjs smart-edit.html smart-edit.js claude-motion-editor.js remotion-bridge.js api/chat.js motion-engine motion-studio-web BUILD-REMOTION-WEB.cmd RENDER-REMOTION.cmd README-0950-REMOTION-FA.md README-0951-FA.md
git diff --cached --quiet
if not errorlevel 1 (
  echo No new Git changes to commit. The Remotion build is already up to date.
  pause
  exit /b 0
)
git commit -m "Add Remotion documentary motion studio"
if errorlevel 1 (
  echo [ERROR] Git commit failed.
  pause
  exit /b 1
)
git push origin main
if errorlevel 1 (
  echo [ERROR] Git push failed. Check the remote/branch and retry.
  pause
  exit /b 1
)
echo.
echo SUCCESS: Remotion player has been built and pushed.
echo Wait for Vercel Production deployment to become Ready.
pause
