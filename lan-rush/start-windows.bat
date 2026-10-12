@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo RushFinder V0225 - LOCAL ONLY (safe default)
echo Only localhost:8787 is accessible until secure connectivity is configured.
echo.
where node >nul 2>nul
if errorlevel 1 (echo Node.js missing & pause & exit /b 1)
set "RUSH_BIND=127.0.0.1"
set "RUSH_COMPANY_IP="
node server.js
pause
