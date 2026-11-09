@echo off
setlocal
title RushFinder - Render MP4 with Remotion
set "PROJECT=%~1"
if "%PROJECT%"=="" (
  echo Drag the downloaded RushFinder-Remotion-Project.json onto this CMD file,
  echo or enter the full path below.
  set /p PROJECT=Project JSON path: 
)
if "%PROJECT%"=="" (
  echo No project file was supplied.
  pause
  exit /b 1
)
set "PROJECT=%PROJECT:"=%"
for %%I in ("%PROJECT%") do set "PROJECT=%%~fI"
cd /d "%~dp0motion-engine"
if not exist node_modules (
  echo Installing Remotion dependencies for local rendering...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)
call npx remotion browser ensure
if errorlevel 1 (
  echo Could not prepare the Remotion rendering browser.
  pause
  exit /b 1
)
call npm run render -- "%PROJECT%"
if errorlevel 1 (
  echo Remotion render failed.
  pause
  exit /b 1
)
echo.
echo Output: %~dp0RushFinder-Remotion-Output.mp4
pause
