@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if not exist "index.html" (
  echo ERROR: index.html was not found. Extract the full RushFinder ZIP first.
  pause
  exit /b 1
)
if not exist "ae-auto-server.js" (
  echo ERROR: ae-auto-server.js was not found. Extract the full RushFinder ZIP first.
  pause
  exit /b 1
)
where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Windows PowerShell was not found.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-RushFinder.ps1"
set "exitCode=%errorlevel%"
if not "%exitCode%"=="0" (
  echo.
  echo RushFinder launcher stopped. See the message above.
  pause
)
exit /b %exitCode%
