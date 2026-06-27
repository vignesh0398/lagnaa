@echo off
title Lagnaa One — Dev Server
cd /d "%~dp0"
echo.
echo Starting Lagnaa API + web app...
echo Keep this window open while you use Lagnaa.
echo Open in browser: http://localhost:5173
echo.
npm.cmd run dev
pause