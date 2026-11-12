@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder - News tag diagnostics
where powershell.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Windows PowerShell is not available.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Check-RushFinder.ps1"
echo.
pause
