@echo off
echo ===================================================
echo Database Migration Utility for Windows
echo ===================================================
echo.

:menu
echo Choose an option:
echo 1. Create new database and apply schema
echo 2. Migrate data from old database to new database
echo 3. Generate sample data for new database
echo 4. Add admin user to new database
echo 5. Switch application to use new database
echo 6. Switch application to use old database
echo 7. Restore original .env file
echo 8. Run complete migration with existing data (steps 1-2-5)
echo 9. Run complete migration with sample data (steps 1-3-5)
echo 10. Run complete migration with sample data and admin user (steps 1-3-4-5)
echo 11. Exit
echo.

set /p choice="Enter your choice (1-11): "

if "%choice%"=="1" goto create_db
if "%choice%"=="2" goto migrate_data
if "%choice%"=="3" goto generate_data
if "%choice%"=="4" goto add_admin
if "%choice%"=="5" goto use_new_db
if "%choice%"=="6" goto use_old_db
if "%choice%"=="7" goto restore_env
if "%choice%"=="8" goto complete_migration_existing
if "%choice%"=="9" goto complete_migration_sample
if "%choice%"=="10" goto complete_migration_sample_admin
if "%choice%"=="11" goto end
goto invalid_choice

:create_db
echo.
echo Creating new database and applying schema...
cd %~dp0
node apply_new_schema.js
echo.
pause
goto menu

:migrate_data
echo.
echo Migrating data from old database to new database...
cd %~dp0
node migrate_data.js
echo.
pause
goto menu

:use_new_db
echo.
echo Switching application to use new database...
cd %~dp0
node update_connection.js
echo.
pause
goto menu

:use_old_db
echo.
echo Switching application to use old database...
cd %~dp0
node update_connection.js --old
echo.
pause
goto menu

:restore_env
echo.
echo Restoring original .env file...
cd %~dp0
node update_connection.js --restore
echo.
pause
goto menu

:generate_data
echo.
echo Generating sample data for new database...
cd %~dp0
node generate_sample_data.js
echo.
pause
goto menu

:add_admin
echo.
echo Adding admin user to new database...
cd %~dp0
node add_admin_user.js
echo.
pause
goto menu

:complete_migration_existing
echo.
echo Running complete migration process with existing data...
echo.
echo Step 1: Creating new database and applying schema...
cd %~dp0
node apply_new_schema.js
echo.
echo Step 2: Migrating data from old database to new database...
node migrate_data.js
echo.
echo Step 3: Switching application to use new database...
node update_connection.js
echo.
echo Migration process completed!
echo.
pause
goto menu

:complete_migration_sample
echo.
echo Running complete migration process with sample data...
echo.
echo Step 1: Creating new database and applying schema...
cd %~dp0
node apply_new_schema.js
echo.
echo Step 2: Generating sample data for new database...
node generate_sample_data.js
echo.
echo Step 3: Switching application to use new database...
node update_connection.js
echo.
echo Migration process completed!
echo.
pause
goto menu

:complete_migration_sample_admin
echo.
echo Running complete migration process with sample data and admin user...
echo.
echo Step 1: Creating new database and applying schema...
cd %~dp0
node apply_new_schema.js
echo.
echo Step 2: Generating sample data for new database...
node generate_sample_data.js
echo.
echo Step 3: Adding admin user to new database...
node add_admin_user.js
echo.
echo Step 4: Switching application to use new database...
node update_connection.js
echo.
echo Migration process completed!
echo.
pause
goto menu

:invalid_choice
echo.
echo Invalid choice. Please try again.
echo.
pause
goto menu

:end
echo.
echo Exiting Database Migration Utility.
echo.
