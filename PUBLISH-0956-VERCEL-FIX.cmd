@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder 0956 - Fix Vercel Hobby 12 function limit
echo RushFinder 0956 - Merge Hermes API into existing chat function
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git is missing.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Extract ZIP into existing RushFinder Git repo folder.&pause&exit /b 1)
where powershell >nul 2>nul
if errorlevel 1 (echo [ERROR] Windows PowerShell is missing.&pause&exit /b 1)
git diff --cached --quiet
if errorlevel 1 (echo [ERROR] There are already staged Git changes. Commit or unstage them before running this patch.&pause&exit /b 1)
echo [1/5] Patching existing site files, preserving API keys and project code...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-0956-VERCEL-LIMIT.ps1"
if errorlevel 1 (echo [ERROR] Patch failed. No Git push.&pause&exit /b 1)
where node >nul 2>nul
if not errorlevel 1 (
  echo [2/5] Checking JavaScript syntax...
  node --check api\chat.js
  if errorlevel 1 (echo [ERROR] chat.js syntax issue; no push.&pause&exit /b 1)
  node --check lib\hermes-handler.cjs
  if errorlevel 1 (echo [ERROR] Hermes handler syntax issue; no push.&pause&exit /b 1)
  node --check hermes-ui.js
  if errorlevel 1 (echo [ERROR] Hermes UI syntax issue; no push.&pause&exit /b 1)
) else (
  echo [WARNING] Node.js unavailable - syntax checks skipped.
)
echo [3/5] Removing old standalone Hermes API from Git...
git rm -f --ignore-unmatch -- api/hermes.js
if errorlevel 1 (echo [ERROR] Could not remove old API from Git.&pause&exit /b 1)
echo [4/5] Staging only the required files...
git add -- api/chat.js lib/hermes-handler.cjs hermes-ui.js smart-edit.html index.html
if errorlevel 1 (echo [ERROR] Git add failed.&pause&exit /b 1)
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "RushFinder 0956: fix Vercel Hobby function count, preserve Hermes and clean editor"
  if errorlevel 1 (echo [ERROR] Git commit failed.&pause&exit /b 1)
) else (
  echo [INFO] No new changes to commit.
)
echo [5/5] Pushing to GitHub main...
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] Git push failed.&pause&exit /b 1)
echo [SUCCESS] Published. Check newest Vercel deployment for Ready.
echo Hermes worker configuration remains separate.
pause
