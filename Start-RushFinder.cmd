@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder - Local news tag engine
if not exist "%~dp0index.html" (
  echo [ERROR] index.html is missing. Extract ALL files from ZIP into one folder.
  pause
  exit /b 1
)
if not exist "%~dp0ae-auto-server.js" (
  echo [ERROR] ae-auto-server.js is missing. Extract ALL files from ZIP.
  pause
  exit /b 1
)
if not exist "%~dp0Start-RushFinder.ps1" (
  echo [ERROR] Start-RushFinder.ps1 is missing.
  pause
  exit /b 1
)
where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Windows PowerShell 5.1 is required.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-RushFinder.ps1"
set "exitCode=%errorlevel%"
if not "%exitCode%"=="0" (
  echo.
  echo [ERROR] RushFinder could not start. Read the messages above.
  echo Run Check-RushFinder.cmd for a full prerequisite report.
  pause
)
exit /b %exitCode%
