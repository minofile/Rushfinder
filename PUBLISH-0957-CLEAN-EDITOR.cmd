@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder 0957 - Clean Editor and Fix Layout
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git is not installed.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Extract these files into your EXISTING RushFinder Git repository.&pause&exit /b 1)
if not exist "smart-edit.html" (echo [ERROR] Missing smart-edit.html&pause&exit /b 1)
if not exist "hermes-ui.js" (echo [ERROR] Missing hermes-ui.js&pause&exit /b 1)
echo [1/3] Stage only editor layout files...
git add -- smart-edit.html hermes-ui.js
if errorlevel 1 (echo [ERROR] git add failed.&pause&exit /b 1)
git diff --cached --quiet -- smart-edit.html hermes-ui.js
if errorlevel 1 (
  git commit -m "RushFinder 0957: remove circled controls and contain advanced editor panel"
  if errorlevel 1 (echo [ERROR] git commit failed.&pause&exit /b 1)
) else (
  echo [INFO] No changes to commit.
)
echo [2/3] Push to main...
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] git push failed.&pause&exit /b 1)
echo [3/3] Check the newest Vercel deployment status.
echo [SUCCESS] UI changes pushed. Refresh the site with Ctrl+F5 after Vercel is Ready.
pause
