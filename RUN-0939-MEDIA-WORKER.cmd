@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Optional local Vecteezy worker secret. Keep it OFF GitHub.
rem Create file vecteezy-worker-secret.local.txt with the SAME secret set
rem as RUSHFINDER_WORKER_SHARED_KEY on Vercel, one line only.
if exist "%~dp0vecteezy-worker-secret.local.txt" (
  set /p RUSHFINDER_WORKER_SHARED_KEY=<"%~dp0vecteezy-worker-secret.local.txt"
)
call "%~dp0RUN-0934-MEDIA-WORKER.cmd"
