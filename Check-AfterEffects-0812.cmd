@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found in PATH.
  pause
  exit /b 1
)
echo ==================================================
echo RushFinder 0812 - test REAL installed After Effects
echo ==================================================
node "%~dp0Check-AfterEffects-0812.js"
echo.
echo Diagnostic report: %%USERPROFILE%%\RushFinder-Cache\AE-Diagnostic-0812.txt
pause
