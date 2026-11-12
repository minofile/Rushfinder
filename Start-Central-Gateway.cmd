@echo off
cd /d "%~dp0"
if exist "tools\node\node.exe" (set "NODE=tools\node\node.exe") else (set "NODE=node")
%NODE% rf-central-gateway.js
echo Gateway stopped. Read error above.
pause
