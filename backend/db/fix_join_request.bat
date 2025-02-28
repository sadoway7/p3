@echo off
echo ===================================================
echo Fixing Community Join Request Table Issue
echo ===================================================
echo.

cd %~dp0
node fix_join_request_name.js

pause