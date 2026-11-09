@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 0968 - AvalAI Image Response Fix
if not exist "infographic.html" (echo [ERROR] Put patch in RushFinder Git folder.&pause&exit /b 1)
if not exist "api\avalai-image.js" (echo [ERROR] Missing api\avalai-image.js.&pause&exit /b 1)
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git not installed.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Run inside RushFinder Git repository.&pause&exit /b 1)
git add -- infographic.html api/avalai-image.js
if errorlevel 1 (echo [ERROR] git add failed.&pause&exit /b 1)
git diff --cached --quiet -- infographic.html api/avalai-image.js
if errorlevel 1 (
 git commit -m "RushFinder 0968: Handle AvalAI image response formats" -- infographic.html api/avalai-image.js
 if errorlevel 1 (echo [ERROR] Git commit failed.&pause&exit /b 1)
) else (echo [INFO] No changes to commit.)
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] Git push failed.&pause&exit /b 1)
echo [SUCCESS] Published to GitHub. Confirm Vercel deployment Ready.
pause
