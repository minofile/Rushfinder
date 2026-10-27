@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (py -3 local_server.py) else (python local_server.py)
if errorlevel 1 (echo Python 3 is required. Install Python from python.org & pause)
