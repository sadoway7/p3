@echo off
echo ===================================================
echo Fixing Community Join Request Table Issue
echo ===================================================
echo.

cd %~dp0
node fix_community_join_request.js

pause