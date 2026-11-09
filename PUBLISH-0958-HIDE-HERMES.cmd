@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder 0958 - Hide circled Hermes controls
if not exist "smart-edit.html" (
  echo [ERROR] Put FIX-0958.ps1 and this CMD file next to smart-edit.html in the RushFinder Git folder.
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git not installed or not in PATH.
  pause
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This is not the RushFinder Git repository folder.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-0958.ps1"
if errorlevel 1 (
  echo [ERROR] Patch failed. No push was attempted.
  pause
  exit /b 1
)
git add -- smart-edit.html
if errorlevel 1 (
  echo [ERROR] Could not stage smart-edit.html.
  pause
  exit /b 1
)
git diff --cached --quiet -- smart-edit.html
if errorlevel 1 (
  git commit -m "RushFinder 0958: hide Hermes heading and unfinished submit controls"
  if errorlevel 1 (
    echo [ERROR] Commit failed.
    pause
    exit /b 1
  )
) else (
  echo [INFO] No new changes to commit.
)
git push origin HEAD:main
if errorlevel 1 (
  echo [ERROR] Push failed. Check Git credentials and branch settings.
  pause
  exit /b 1
)
echo.
echo [OK] Pushed to GitHub. Wait for Vercel deployment to show READY, then press Ctrl+F5.
pause
