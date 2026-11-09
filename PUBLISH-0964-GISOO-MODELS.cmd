@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 0964 - Fix Gisoo Model IDs
if not exist "infographic.html" (
  echo [ERROR] Extract this ZIP into the RushFinder Git repository root, next to infographic.html
  pause
  exit /b 1
)
if not exist "api\avalai-image.js" (
  echo [ERROR] Missing api\avalai-image.js - preserve folder structure when extracting.
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed or not available in PATH.
  pause
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Open this CMD from your RushFinder Git repository root.
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
  git commit -m "RushFinder 0964: correct Gisoo GPT Image model IDs" -- infographic.html api/avalai-image.js
  if errorlevel 1 (
    echo [ERROR] git commit failed.
    pause
    exit /b 1
  )
) else (
  echo [INFO] No changes to commit.
)
git push origin HEAD:main
if errorlevel 1 (
  echo [ERROR] git push failed. See message above.
  pause
  exit /b 1
)
echo [SUCCESS] Pushed fixed Gisoo model IDs. Wait for Vercel Ready, then Ctrl+F5.
pause
