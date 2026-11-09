@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder 0959 - Rename Hermes UI labels
if not exist "smart-edit.html" (
  echo [ERROR] Copy these files into the RushFinder Git folder, next to smart-edit.html.
  pause
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository, or Git is unavailable.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-0959-LABELS.ps1"
if errorlevel 1 (
  echo [ERROR] Unable to apply the patch.
  pause
  exit /b 1
)
git add -- smart-edit.html
if errorlevel 1 ( echo [ERROR] Git add failed. & pause & exit /b 1 )
git diff --cached --quiet -- smart-edit.html
if errorlevel 1 (
  git commit -m "RushFinder 0959: rename Hermes editor button and title"
  if errorlevel 1 ( echo [ERROR] Git commit failed. & pause & exit /b 1 )
) else (
  echo [INFO] Labels already match. No new commit.
)
git push origin HEAD:main
if errorlevel 1 ( echo [ERROR] Git push failed. & pause & exit /b 1 )
echo [OK] Published source to GitHub. Check Vercel READY, then Ctrl+F5.
pause
