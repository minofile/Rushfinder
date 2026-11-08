@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo RushFinder 0945 - remove two instruction panels
where git >nul 2>&1
if errorlevel 1 (echo ERROR: Git is not installed. & pause & exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (echo ERROR: Extract this ZIP into RushFinder GitHub project folder first. & pause & exit /b 1)
if not exist "smart-edit.html" (echo ERROR: smart-edit.html not found. & pause & exit /b 1)
git add -- smart-edit.html
if errorlevel 1 (echo ERROR: git add failed. & pause & exit /b 1)
git diff --cached --quiet -- smart-edit.html
if not errorlevel 1 (echo No new UI change to publish. & pause & exit /b 0)
git commit -m "RushFinder 0945: hide verbose editor guidance" -- smart-edit.html
if errorlevel 1 (echo ERROR: git commit failed. & pause & exit /b 1)
git push origin main
if errorlevel 1 (echo ERROR: git push failed. & pause & exit /b 1)
echo Published. Check Vercel Deployments for Ready and refresh browser (Ctrl+F5).
pause
