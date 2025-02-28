@echo off
echo Updating frontend components to work with singular table names

REM Copy new API compatibility layer
copy "src\api\compatibility.ts" "src\api\compatibility.ts"

REM Replace components with updated versions
copy /Y "src\components\ActivityHistory.tsx.new" "src\components\ActivityHistory.tsx"
copy /Y "src\components\CommunityHeader.tsx.new" "src\components\CommunityHeader.tsx"
copy /Y "src\components\PostList.tsx.new" "src\components\PostList.tsx"
copy /Y "src\components\CommunityRules.tsx.new" "src\components\CommunityRules.tsx"

echo Updated components successfully!
echo.
echo Please restart your frontend development server to apply changes.
pause