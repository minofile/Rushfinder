@echo off
setlocal
cd /d "%~dp0"
if not exist ".git" (
  echo [ERROR] Please copy this patch's files into the root of your RushFinder Git repository first.
  pause
  exit /b 1
)
where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git is not available in PATH.
  pause
  exit /b 1
)
git add -- api/chat.js claude-motion-editor.js smart-edit.html vercel.json
if errorlevel 1 (echo [ERROR] git add failed & pause & exit /b 1)
git diff --cached --quiet
if not errorlevel 1 (
  echo No file differences to publish.
  pause
  exit /b 0
)
git commit -m "RushFinder 0946: Groq motion storyboard integration"
if errorlevel 1 (echo [ERROR] git commit failed & pause & exit /b 1)
git push origin main
if errorlevel 1 (echo [ERROR] git push failed & pause & exit /b 1)
echo Changes pushed. Check the Vercel deployment status.
pause
