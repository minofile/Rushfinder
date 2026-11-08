@echo off
chcp 65001 >nul
if "%~2"=="" (
  echo Usage:
  echo RUN-0933-AUTOCUT.cmd "Storyboard.json" "C:\YourLicensedFootageFolder" "C:\Narration.mp3"
  echo Required: Video filenames must include their YouTube video IDs.
  pause
  exit /b 1
)
set "FFMPEG=C:\Users\m_rajabi\AppData\Local\RushFinder\tools\ffmpeg.exe"
if not exist "%FFMPEG%" set "FFMPEG=ffmpeg"
if "%~3"=="" (
  py -3 "%~dp0tools\auto_cut_renderer.py" --storyboard "%~1" --sources "%~2" --rights-confirmed --ffmpeg "%FFMPEG%"
) else (
  py -3 "%~dp0tools\auto_cut_renderer.py" --storyboard "%~1" --sources "%~2" --narration "%~3" --rights-confirmed --ffmpeg "%FFMPEG%"
)
pause
