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
  echo This folder is not a Git repository. Extract ZIP contents into existing RushFinder GitHub folder.
  pause
  exit /b 1
)
git add -- smart-edit.html smart-autocut.js api/youtube-music.js lib/vecteezy.mjs tools/rf_media_worker.py RUN-0939-MEDIA-WORKER.cmd README-0939-VECTEEZY-FA.md .gitignore tests/test-0939-vecteezy.mjs PUBLISH-0939-GITHUB.cmd
if errorlevel 1 (echo Could not stage changes. & pause & exit /b 1)
git diff --cached --quiet
if not errorlevel 1 (
  echo No changes to send. Make sure version 0939 files replaced old files in the Git repository.
  git status --short
  pause
  exit /b 0
)
git commit -m "RushFinder 0939: Vecteezy optional licensed stock source"
if errorlevel 1 (echo Commit failed. & pause & exit /b 1)
git push
if errorlevel 1 (echo Push failed. Check GitHub sign-in and network. & pause & exit /b 1)
echo Changes uploaded to GitHub. Check Vercel deployment.
pause
