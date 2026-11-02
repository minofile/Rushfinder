@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Move-Old-RushFinder-Outputs.ps1"
echo.
pause
