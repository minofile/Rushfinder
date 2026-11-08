@echo off
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>&1
if errorlevel 1 (
  echo Git not found in PATH.
  pause
  exit /b 1
)
git rev-parse --show-toplevel >nul 2>&1
if errorlevel 1 (
  echo This folder is not a Git repository. Extract ZIP contents into your existing RushFinder GitHub folder first.
  pause
  exit /b 1
)
git add -- smart-edit.html smart-edit.js claude-motion-editor.js api/claude-motion-plan.js README-0943-CLAUDE-CHATGPT-FA.md PUBLISH-0943-GITHUB.cmd
if errorlevel 1 (echo Could not stage changes. & pause & exit /b 1)
git diff --cached --quiet
if not errorlevel 1 (
  echo No new changes to send.
  git status --short
  pause
  exit /b 0
)
git commit -m "RushFinder 0943: Claude motion editor and ChatGPT placeholder"
if errorlevel 1 (echo Commit failed. & pause & exit /b 1)
git push
if errorlevel 1 (echo Push failed. Check GitHub sign-in and network. & pause & exit /b 1)
echo Changes uploaded to GitHub. Check Vercel deployment status.
pause
