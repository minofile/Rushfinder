@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 0967 - AvalAI Image Fix
if not exist "infographic.html" (
 echo [ERROR] Extract ZIP into RushFinder Git repository ROOT.
 pause
 exit /b 1
)
if not exist "api\avalai-image.js" (
 echo [ERROR] Missing api\avalai-image.js. Preserve ZIP folder structure.
 pause
 exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git is not installed.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Open the script from the RushFinder Git folder.&pause&exit /b 1)
git add -- infographic.html api/avalai-image.js
if errorlevel 1 (echo [ERROR] Git staging failed.&pause&exit /b 1)
git diff --cached --quiet -- infographic.html api/avalai-image.js
if errorlevel 1 (
 git commit -m "RushFinder 0967: AvalAI image backend and key" -- infographic.html api/avalai-image.js
 if errorlevel 1 (echo [ERROR] Git commit failed.&pause&exit /b 1)
) else (echo [INFO] No uncommitted changes.)
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] Git push failed.&pause&exit /b 1)
echo [SUCCESS] Pushed to GitHub. Wait for Vercel Ready, then Ctrl+F5.
pause
