@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder 0955 - Remove AutoCut UI
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git is not installed.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Extract into your EXISTING RushFinder Git folder.&pause&exit /b 1)
for %%F in (smart-edit.html smart-edit.js hermes-ui.js) do (
 if not exist "%%F" (echo [ERROR] Missing file %%F&pause&exit /b 1)
)
echo [1/3] Staging ONLY editor UI files...
git add -- smart-edit.html smart-edit.js hermes-ui.js
if errorlevel 1 (echo [ERROR] git add failed.&pause&exit /b 1)
git diff --cached --quiet -- smart-edit.html smart-edit.js hermes-ui.js
if errorlevel 1 (
 git commit -m "RushFinder 0955: remove obsolete YouTube auto-cut and legacy quick edit panels"
 if errorlevel 1 (echo [ERROR] git commit failed.&pause&exit /b 1)
) else (
 echo [INFO] No changes to publish.
)
echo [2/3] Pushing to GitHub main...
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] git push failed.&pause&exit /b 1)
echo [3/3] Check Vercel Ready, then refresh site with Ctrl+F5.
echo [SUCCESS] Editor UI patch published. API keys and Hermes bridge not modified.
pause
