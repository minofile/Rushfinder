@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RushFinder 01001 - Fix Empty Strip Under Khabar Fori Logo
if not exist "infographic.html" (echo [ERROR] infographic.html missing.&pause&exit /b 1)
where git >nul 2>nul
if errorlevel 1 (echo [ERROR] Git not installed.&pause&exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (echo [ERROR] Copy the file to your RushFinder Git project folder.&pause&exit /b 1)
if not exist "assets\infographic-templates\urgent-square.png" (echo [ERROR] Original RushFinder 01000 template is missing.&pause&exit /b 1)
git add -- infographic.html
if errorlevel 1 (echo [ERROR] git add failed.&pause&exit /b 1)
git diff --cached --quiet
if errorlevel 1 (
 git commit -m "RushFinder 01001: Fill logo rail without altering original brand image"
 if errorlevel 1 (echo [ERROR] git commit failed.&pause&exit /b 1)
) else (echo [INFO] No changes to commit.)
git push origin HEAD:main
if errorlevel 1 (echo [ERROR] git push failed.&pause&exit /b 1)
echo [SUCCESS] Check Vercel Ready, then refresh infographic using Ctrl+F5.
pause
