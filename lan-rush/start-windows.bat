@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo RushFinder - Local video archive
echo.
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is not installed. Install Node.js LTS from https://nodejs.org/
 pause
 exit /b 1
)
node server.js
pause
