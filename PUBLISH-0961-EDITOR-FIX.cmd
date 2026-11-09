@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 0961 - Remove duplicate fields and fix spacing
if not exist "smart-edit.html" (
  echo [ERROR] Extract this patch into the RushFinder Git folder next to smart-edit.html.
  pause
  exit /b 1
)
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed.
  pause
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This is not your RushFinder Git folder.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-0961-DEDUP-AND-SPACING.ps1"
if errorlevel 1 (
  echo [ERROR] Patch failed; not publishing.
  pause
  exit /b 1
)
git add -- smart-edit.html
if errorlevel 1 (
  echo [ERROR] git add failed.
  pause
  exit /b 1
)
git diff --cached --quiet -- smart-edit.html
if errorlevel 1 (
  git commit -m "RushFinder 0961: hide duplicate narration fields and fix export format spacing" -- smart-edit.html
  if errorlevel 1 (
    echo [ERROR] git commit failed.
    pause
    exit /b 1
  )
) else (
  echo [INFO] No editor changes to commit.
)
git push origin HEAD:main
if errorlevel 1 (
  echo [ERROR] Git push failed. See error above.
  pause
  exit /b 1
)
echo [SUCCESS] Pushed. Check Vercel deployment Ready, then Ctrl+F5.
pause
