@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 01003 - Khabar Fori Premium Theme
if not exist "infographic.html" (echo [ERROR] infographic.html not found.&pause&exit /b 1)
if not exist "assets\infographic-templates\urgent-square.png" (echo [ERROR] Original Khabar Fori logo template missing. Install RushFinder 01000 web assets first.&pause&exit /b 1)
if not exist "assets\infographic-templates\urgent-story.png" (echo [ERROR] Original story logo template missing.&pause&exit /b 1)
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git is not installed.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Extract this patch in your RushFinder Git project root.&pause&exit /b 1)
git add -- infographic.html
if errorlevel 1 (echo [ERROR] git add failed.&pause&exit /b 1)
git diff --cached --quiet -- infographic.html
if errorlevel 1 (
 git commit -m "RushFinder 01003: Lock Khabar Fori green editorial infographic style"
 if errorlevel 1 (echo [ERROR] git commit failed.&pause&exit /b 1)
) else (echo [INFO] No changes to commit.)
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] git push failed. Check Git credentials / branch.&pause&exit /b 1)
echo [SUCCESS] Wait for Vercel Ready, then Ctrl+F5. Try one NEW infographic only after checking the review prompt.
pause
