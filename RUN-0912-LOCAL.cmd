@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js was not found. Install Node.js or open the published site.
 pause
 exit /b 1
)
node "local-preview-0912.cjs"
if errorlevel 1 pause
