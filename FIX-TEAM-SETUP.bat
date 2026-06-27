@echo off
title Lagnaa - Fix Team Profiles (MongoDB)
color 0B
echo.
echo  ============================================================
echo   LAGNAA - Keep team members after deploy (2 clicks)
echo  ============================================================
echo.
echo  Your Render secret file is ALREADY working.
echo  Only MongoDB Atlas must allow Render to connect.
echo.
echo  STEP 1 - This will open MongoDB Network Access in your browser.
echo           Click: ADD IP ADDRESS
echo           Choose: ALLOW ACCESS FROM ANYWHERE  (0.0.0.0/0)
echo           Click: CONFIRM
echo           Wait 2 minutes.
echo.
pause
start https://cloud.mongodb.com/v2#/security/network/accessList
echo.
echo  STEP 2 - After Step 1, press any key to open Render redeploy.
echo           Click: MANUAL DEPLOY - Deploy latest commit
echo           Wait 5 minutes.
echo.
pause
start https://dashboard.render.com/
echo.
echo  STEP 3 - Check this link in browser after deploy:
echo           https://lagnaa.onrender.com/api/health
echo.
echo  SUCCESS when you see:
echo     "teamPersistence": "mongo"
echo     "teamDataDurable": true
echo.
echo  Then create team members on live site ONE LAST TIME.
echo.
pause