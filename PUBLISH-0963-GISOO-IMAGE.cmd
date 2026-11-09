@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 0963 - Gisoo GPT Image 2.6
if not exist "infographic.html" (
  echo [ERROR] Extract ZIP in RushFinder repository root, beside infographic.html
  pause
  exit /b 1
)
if not exist "api\avalai-image.js" (
  echo [ERROR] Missing api\avalai-image.js - extract with folders
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git not found.
  pause
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not your Git repository.
  pause
  exit /b 1
)
git add -- infographic.html api/avalai-image.js
if errorlevel 1 (
  echo [ERROR] Git add failed.
  pause
  exit /b 1
)
git diff --cached --quiet -- infographic.html api/avalai-image.js
if errorlevel 1 (
  git commit -m "RushFinder 0963: switch infographic image API to Gisoo" -- infographic.html api/avalai-image.js
  if errorlevel 1 (
    echo [ERROR] Commit failed.
    pause
    exit /b 1
  )
) else (
  echo [INFO] No changes to commit.
)
git push origin HEAD:main
if errorlevel 1 (
  echo [ERROR] Push failed. Check your Git credentials.
  pause
  exit /b 1
)
echo [SUCCESS] Pushed changes to GitHub. Add GISOO_API_KEY and RF_INFO_ACCESS_CODE in Vercel, then redeploy.
pause
