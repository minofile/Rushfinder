@echo off
chcp 65001 >nul
cd /d "%~dp0"
where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo FFmpeg is missing. Run setup-ffmpeg.ps1 first, then open a new terminal.
  pause
  exit /b 1
)
py -3 -m yt_dlp --version >nul 2>&1
if errorlevel 1 (
  echo Installing yt-dlp for video retrieval...
  py -3 -m pip install -U yt-dlp
  if errorlevel 1 (echo Could not install yt-dlp & pause & exit /b 1)
)
echo Keep this window open while using the RushFinder website.
py -3 tools\rf_media_worker.py
pause
