@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 0966 - Official OpenAI Images
if not exist "infographic.html" (
  echo [ERROR] Extract ZIP in the root of RushFinder Git repository.
  pause
  exit /b 1
)
if not exist "api\avalai-image.js" (
  echo [ERROR] API file missing. Preserve the folder structure.
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git not found.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Run in RushFinder Git repository.&pause&exit /b 1)
git add -- infographic.html api/avalai-image.js
if errorlevel 1 (echo [ERROR] git add failed.&pause&exit /b 1)
git diff --cached --quiet -- infographic.html api/avalai-image.js
if errorlevel 1 (
  git commit -m "RushFinder 0966: OpenAI image API provider" -- infographic.html api/avalai-image.js
  if errorlevel 1 (echo [ERROR] git commit failed.&pause&exit /b 1)
) else (echo [INFO] No source changes; checking remote.)
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] git push failed.&pause&exit /b 1)
echo [SUCCESS] OpenAI image API update pushed. Check Vercel Ready.
pause
