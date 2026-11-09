@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder 0952 - Remove Remotion Studio UI

echo.
echo [1/3] Removing unused Remotion Studio button...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0REMOVE-REMOTION-UI.ps1"
if errorlevel 1 (
  echo [ERROR] No files published. Please read the error above.
  pause
  exit /b 1
)
echo.
echo [2/3] Checking Git repository...
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed or not in PATH. HTML was updated locally only.
  pause
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not the existing RushFinder Git repository. HTML updated locally only.
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
  git commit -m "Remove broken Remotion Studio UI from editor"
  if errorlevel 1 (
    echo [ERROR] Git commit failed.
    pause
    exit /b 1
  )
) else (
  echo [OK] No new HTML changes to commit.
)
echo.
echo [3/3] Publishing page-only change to GitHub main...
git push origin HEAD:main
if errorlevel 1 (
  echo [ERROR] Git push failed. Please inspect the error above.
  pause
  exit /b 1
)
echo.
echo [SUCCESS] Published. Wait for Vercel Ready, then Ctrl+F5 in RushFinder.
echo Remotion build status in GitHub Actions is a separate issue; it is not needed to remove this button.
pause
