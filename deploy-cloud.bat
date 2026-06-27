@echo off
title Lagnaa - Deploy to Cloud
cd /d "%~dp0"

set GIT="C:\Program Files\Git\bin\git.exe"
if not exist %GIT% set GIT=git

echo.
echo  ============================================
echo   Lagnaa Cloud Deploy (GitHub + Render)
echo  ============================================
echo.

%GIT% status >nul 2>&1
if errorlevel 1 (
  echo Git not found. Restart PC after Git install, then run this again.
  pause
  exit /b 1
)

echo [1/3] Checking git commit...
%GIT% diff --quiet && %GIT% diff --cached --quiet
if errorlevel 1 (
  echo Saving latest changes...
  %GIT% add -A
  %GIT% commit -m "Update before cloud deploy"
)

echo.
echo [2/3] Push to GitHub
echo.
echo  I cannot log into YOUR GitHub account from here.
echo  One-time setup (~2 minutes):
echo.
echo  A) Browser opens to create a new GitHub repo named: lagnaa
echo  B) After creating, copy the repo URL and paste below.
echo.
start https://github.com/new?name=lagnaa^&description=Lagnaa+AI+CRM

set /p REPO_URL=Paste your GitHub repo URL (e.g. https://github.com/you/lagnaa.git): 
if "%REPO_URL%"=="" (
  echo No URL entered. Run deploy-cloud.bat again when ready.
  pause
  exit /b 1
)

%GIT% remote remove origin 2>nul
%GIT% remote add origin %REPO_URL%
%GIT% push -u origin main
if errorlevel 1 (
  echo.
  echo Push failed. Sign in to GitHub in the browser window that opens,
  echo then run this script again.
  echo.
  pause
  exit /b 1
)

echo.
echo [3/3] Deploy on Render
echo.
echo  Browser opens Render Blueprint setup.
echo  - Sign up / log in with GitHub
echo  - Select your lagnaa repo
echo  - Add secret env vars from your .env file:
echo      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
echo      GROQ_API_KEY, GOOGLE_PLACES_API_KEY (optional)
echo  - Click Apply
echo.
start https://dashboard.render.com/blueprints

echo.
echo Done! After Render finishes (~5 min), open your app URL.
echo Login: admin@datacrew.ai / admin123
echo.
echo Future updates: just run
echo   git add -A ^&^& git commit -m "update" ^&^& git push
echo and Render auto-redeploys.
echo.
pause