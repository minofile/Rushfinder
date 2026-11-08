@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo RushFinder 0941 - self-contained APIs
echo ==========================================
where git >nul 2>&1
if errorlevel 1 (echo ERROR: Git is not installed. & pause & exit /b 1)
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (echo ERROR: Extract into your existing Rushfinder GitHub repository. & pause & exit /b 1)
if not exist "api\youtube-music.js" (echo ERROR: api\youtube-music.js missing. & pause & exit /b 1)
if not exist "api\chat.js" (echo ERROR: api\chat.js missing. & pause & exit /b 1)
findstr /C:"self-contained Vercel functions" "api\youtube-music.js" >nul
if errorlevel 1 (echo ERROR: 0941 code was not extracted into this folder. & pause & exit /b 1)
where node >nul 2>&1
if not errorlevel 1 (
 node --check "api\youtube-music.js"
 if errorlevel 1 (echo ERROR: syntax in youtube-music.js. & pause & exit /b 1)
 node --check "api\chat.js"
 if errorlevel 1 (echo ERROR: syntax in chat.js. & pause & exit /b 1)
 node "tests\test-0941-api-self-contained.mjs"
 if errorlevel 1 (echo ERROR: self-contained API tests failed. & pause & exit /b 1)
)
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if /I not "%CURRENT_BRANCH%"=="main" (
 echo ERROR: Vercel Production uses main. Current branch is %CURRENT_BRANCH%.
 echo Switch to main before publishing.
 pause
 exit /b 1
)
echo Staging only relevant repair files...
git add -- api/youtube-music.js api/chat.js tests/test-0941-api-self-contained.mjs README-0941-API-JSON-FIX-FA.md PUBLISH-0941-GITHUB.cmd
if errorlevel 1 (echo ERROR: git add failed. & pause & exit /b 1)
git diff --cached --quiet -- api/youtube-music.js api/chat.js tests/test-0941-api-self-contained.mjs README-0941-API-JSON-FIX-FA.md PUBLISH-0941-GITHUB.cmd
if not errorlevel 1 (
 echo ERROR: No changes detected. Verify that this repair was not already published.
 pause
 exit /b 1
)
git commit --only -m "RushFinder 0941: self-contained API fixes" -- api/youtube-music.js api/chat.js tests/test-0941-api-self-contained.mjs README-0941-API-JSON-FIX-FA.md PUBLISH-0941-GITHUB.cmd
if errorlevel 1 (echo ERROR: Commit failed. & pause & exit /b 1)
git push origin main
if errorlevel 1 (echo ERROR: Push failed. Check GitHub access. & pause & exit /b 1)
echo SUCCESS: Changes pushed. Verify Vercel Production deployment and runtime logs.
pause
