@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 0960 - Fix Persian labels
if not exist "smart-edit.html" (
  echo [ERROR] Extract this ZIP into the RushFinder Git folder next to smart-edit.html.
  pause
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] The folder is not a Git repository or Git is not installed.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-0960-UTF8-LABELS.ps1"
if errorlevel 1 (
  echo [ERROR] Patch failed. No publication attempted.
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
  git commit -m "RushFinder 0960: repair Persian editor title and request button" -- smart-edit.html
  if errorlevel 1 (
    echo [ERROR] git commit failed.
    pause
    exit /b 1
  )
) else (
  echo [INFO] No changes to publish.
)
git push origin HEAD:main
if errorlevel 1 (
  echo [ERROR] Git push failed.
  pause
  exit /b 1
)
echo [OK] Published. In Vercel, wait for Ready, then Ctrl+F5.
pause
