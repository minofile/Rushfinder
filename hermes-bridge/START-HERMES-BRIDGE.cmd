@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title RushFinder Hermes Bridge 0954
where py >nul 2>nul
if not errorlevel 1 (py -3 bridge.py & goto :end)
where python >nul 2>nul
if not errorlevel 1 (python bridge.py & goto :end)
echo [ERROR] Python 3 is required on this PC. Run python --version.
:end
pause
