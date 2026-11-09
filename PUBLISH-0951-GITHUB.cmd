@echo off
setlocal
title RushFinder 0951 - Publish Remotion Fix
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
 echo [ERROR] Git is missing. Install Git for Windows.
 pause
 exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
 echo [ERROR] Extract the ZIP into the existing local GitHub RushFinder repository first.
 pause
 exit /b 1
)
echo.
echo [1/2] Saving Remotion fixes to Git...
git add .github/workflows/build-remotion.yml scripts/verify-remotion.mjs motion-engine motion-studio-web/index.html smart-edit.html remotion-bridge.js PUBLISH-0951-GITHUB.cmd README-0951-FA.md
if errorlevel 1 (
 echo [ERROR] Could not stage files.
 pause
 exit /b 1
)
git diff --cached --quiet
if errorlevel 1 (
 git commit -m "Fix Remotion Studio: full screen and cloud build"
 if errorlevel 1 (
  echo [ERROR] Git commit failed.
  pause
  exit /b 1
 )
) else (
 echo No changes to commit.
)
echo.
echo [2/2] Publishing to GitHub...
git push origin HEAD:main
if errorlevel 1 (
 echo [ERROR] Git push failed. Check origin/main and Git credentials.
 pause
 exit /b 1
)
echo.
echo Source published. GitHub Actions will now build the real Remotion Player.
echo Open GitHub - Actions - Build Remotion Studio and wait for a green check.
echo Then wait for Vercel Ready and reload RushFinder with Ctrl+F5.
echo IMPORTANT: A successful push alone does not mean Remotion is ready.
pause
