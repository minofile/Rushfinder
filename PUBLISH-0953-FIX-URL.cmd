@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder 0953 - Fix URL hash

echo.
echo [1/3] Fixing RushFinder URL hash in index.html...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-0953-URL-HASH.ps1"
if errorlevel 1 (
 echo [ERROR] No changes published. Check the error above.
 pause
 exit /b 1
)

echo.
echo [2/3] Checking repository and committing index.html only...
where git >nul 2>nul
if errorlevel 1 (
 echo [ERROR] Git not available. File changed locally; publish it manually.
 pause
 exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
 echo [ERROR] Not in RushFinder Git folder. File changed locally only.
 pause
 exit /b 1
)
git add -- index.html
if errorlevel 1 (
 echo [ERROR] Failed to stage index.html.
 pause
 exit /b 1
)
git diff --cached --quiet -- index.html
if errorlevel 1 (
 git commit -m "Fix persistent smart-edit URL hash"
 if errorlevel 1 (
  echo [ERROR] Commit failed.
  pause
  exit /b 1
 )
) else (
 echo [OK] No changes to commit.
)

echo.
echo [3/3] Pushing to main...
git push origin HEAD:main
if errorlevel 1 (
 echo [ERROR] Push failed. Please send a screenshot of this window.
 pause
 exit /b 1
)
echo.
echo [SUCCESS] Published fix. When Vercel is Ready, press Ctrl+F5 on the site.
pause
