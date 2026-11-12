@echo off
cd /d "%~dp0"
echo [1/3] Starting RushFinder local engine...
call "%~dp0Start-RushFinder.cmd"
echo [2/3] Starting authenticated central gateway...
start "RushFinder Secure Gateway" cmd /k ""%~dp0Start-Central-Gateway.cmd""
timeout /t 3 /nobreak >nul
echo [3/3] Starting Cloudflare Tunnel...
start "RushFinder Cloudflare Tunnel" cmd /k ""%~dp0Start-Cloudflare-Tunnel.cmd""
echo.
echo IMPORTANT: Quick Tunnel URL may change on restart.
echo Update RF_TAG_GATEWAY_URL in Vercel and redeploy if it changes.
echo Keep the Gateway and Tunnel windows open.
pause
