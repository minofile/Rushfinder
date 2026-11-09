@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 0965 - Gisoo GPT Image 2.5 Flare
if not exist "infographic.html" (
  echo [ERROR] Extract this ZIP in the root of your RushFinder Git repository.
  pause
  exit /b 1
)
if not exist "api\avalai-image.js" (
  echo [ERROR] Missing api\avalai-image.js - keep the folder structure.
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git was not found.
  pause
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not the RushFinder Git repository.
  pause
  exit /b 1
)
git add -- infographic.html api/avalai-image.js
if errorlevel 1 (
  echo [ERROR] git add failed.
  pause
  exit /b 1
)
git diff --cached --quiet -- infographic.html api/avalai-image.js
if errorlevel 1 (
  git commit -m "RushFinder 0965: use approved Gisoo GPT Image 2.5 Flare" -- infographic.html api/avalai-image.js
  if errorlevel 1 (
    echo [ERROR] git commit failed.
    pause
    exit /b 1
  )
) else (
  echo [INFO] Nothing changed; checking remote.
)
git push origin HEAD:main
if errorlevel 1 (
  echo [ERROR] git push failed - inspect messages above.
  pause
  exit /b 1
)
echo [SUCCESS] Model changed to gpt-image-2.5-flare. Check Vercel Ready; refresh the Infographic page with Ctrl+F5.
pause
