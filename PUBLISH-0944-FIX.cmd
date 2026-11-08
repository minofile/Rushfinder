@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo RushFinder 0944 - fix Vercel Hobby deployment (12 APIs)
where git >nul 2>&1
if errorlevel 1 (echo ERROR: Git is not installed. & pause & exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (echo ERROR: Run this from RushFinder GitHub repository. & pause & exit /b 1)
if not exist "api\chat.js" (echo ERROR: api\chat.js missing. Extract ZIP into repository first. & pause & exit /b 1)
if not exist "claude-motion-editor.js" (echo ERROR: Claude editor file missing. & pause & exit /b 1)
REM IMPORTANT: Delete the old Vercel Function to remove the 13th function.
if exist "api\claude-motion-plan.js" del /f /q "api\claude-motion-plan.js"
git rm --ignore-unmatch -- "api/claude-motion-plan.js" >nul 2>&1
git add -- "api/chat.js" "claude-motion-editor.js" "vercel.json" "README-0944-DEPLOY-FIX-FA.md" "PUBLISH-0944-FIX.cmd"
if errorlevel 1 (echo ERROR: Could not stage files. & pause & exit /b 1)
echo.
echo Checking function count...
for /f %%N in ('git ls-files "api/*.js" ^| find /c ".js"') do set API_COUNT=%%N
echo API files tracked: %API_COUNT%
if not "%API_COUNT%"=="12" (
 echo WARNING: Expected 12 API files. Please check api folder before publishing.
 pause
 exit /b 1
)
git diff --cached --quiet
if not errorlevel 1 (echo No staged changes to send. & git status --short & pause & exit /b 0)
git commit -m "RushFinder 0944: merge Claude motion endpoint to stay under Hobby function limit"
if errorlevel 1 (echo ERROR: Commit failed. & pause & exit /b 1)
git push
if errorlevel 1 (echo ERROR: Push failed. & pause & exit /b 1)
echo.
echo Published. Open Vercel Deployments and check Ready.
pause
