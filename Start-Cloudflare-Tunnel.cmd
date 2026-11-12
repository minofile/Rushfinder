@echo off
cd /d "%~dp0"
echo Start-Central-Gateway.cmd first. Quick Tunnel URL changes on restart.
cloudflared tunnel --url http://127.0.0.1:18828
pause
