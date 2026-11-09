@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 01000 - Publish Web
if not exist "infographic.html" (echo [ERROR] Extract ZIP into your main RushFinder Git folder.&pause&exit /b 1)
if not exist "assets\infographic-templates\urgent-square.png" (echo [ERROR] Missing original logo image.&pause&exit /b 1)
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git is missing.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Not a Git repository. Put the files in your RushFinder Git folder.&pause&exit /b 1)
git add -- infographic.html assets/infographic-templates/urgent-square.png assets/infographic-templates/farda-square.png assets/infographic-templates/farda-story.png
if errorlevel 1 (echo [ERROR] git add failed.&pause&exit /b 1)
git diff --cached --quiet
if errorlevel 1 (
 git commit -m "RushFinder 01000: Locked original infographic logos"
 if errorlevel 1 (echo [ERROR] Commit failed.&pause&exit /b 1)
) else (echo [INFO] No changes to commit.)
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] Push failed.&pause&exit /b 1)
echo [SUCCESS] Files pushed to GitHub. Check Vercel deployment Ready.
pause
