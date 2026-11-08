@echo off
setlocal
cd /d "%~dp0"
echo RushFinder 0947 - publish automatic motion timeline fix
where git >nul 2>nul
if errorlevel 1 (
  echo ERROR: Git is not installed or not in PATH.
  pause
  exit /b 1
)
if not exist .git (
  echo ERROR: Please copy these files into the Rushfinder GitHub repository folder first.
  pause
  exit /b 1
)
git add -- smart-edit.html smart-edit.js claude-motion-editor.js
if errorlevel 1 (
  echo ERROR: Could not stage files.
  pause
  exit /b 1
)
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "RushFinder 0947 automatic motion timeline"
  if errorlevel 1 (
    echo ERROR: Commit failed.
    pause
    exit /b 1
  )
) else (
  echo No new local changes - checking remote push.
)
git push origin main
if errorlevel 1 (
  echo ERROR: Git push failed. Check the output above.
  pause
  exit /b 1
)
echo Published to GitHub. Check Vercel Deployments for Ready.
pause
