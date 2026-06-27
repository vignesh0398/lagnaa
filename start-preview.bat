@echo off
cd /d "%~dp0"
echo Starting VoxFlow (API + Web App)...
cmd /c "npm run dev:all"
pause