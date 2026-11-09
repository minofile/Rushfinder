@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder 0954 - Hermes Editor Publish

echo ----------------------------------------------
echo RushFinder 0954 - Hermes and clean editor UI
echo ----------------------------------------------
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git was not found.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Copy the extracted ZIP to the EXISTING RushFinder Git repository folder first.&pause&exit /b 1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-0954-INDEX-CACHE.ps1"
if errorlevel 1 (echo [ERROR] Could not update index.html cache reference.&pause&exit /b 1)
for %%F in (smart-edit.html smart-edit.js hermes-ui.js api\hermes.js) do (
 if not exist "%%F" (echo [ERROR] Missing file %%F &pause&exit /b 1)
)
echo [1/3] Staging only site and server code; no secrets or worker config...
git add -- index.html smart-edit.html smart-edit.js hermes-ui.js api/hermes.js
if errorlevel 1 (echo [ERROR] Git add failed.&pause&exit /b 1)
git diff --cached --quiet -- index.html smart-edit.html smart-edit.js hermes-ui.js api/hermes.js
if errorlevel 1 (
 git commit -m "RushFinder 0954: clean editor and Hermes job bridge"
 if errorlevel 1 (echo [ERROR] Git commit failed.&pause&exit /b 1)
) else (
 echo [INFO] No new changes in patch files.
)
echo [2/3] Pushing to GitHub main...
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] Git push failed.&pause&exit /b 1)
echo [3/3] Done. Wait for Vercel Ready; configure Hermes bridge before submitting real jobs.
echo [SUCCESS] Site code published; the coworker Hermes PC bridge must still be set up.
pause
