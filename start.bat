@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.env" copy /y "backend\.env.example" "backend\.env" >nul
if not exist "frontend\.env.local" copy /y "frontend\.env.example" "frontend\.env.local" >nul

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found on this PC.
  echo Install Node.js from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

call :prepare_npm_workspace

if not exist "node_modules" (
  echo Dependencies were not found. Running npm install first...
  call npm install
  if errorlevel 1 goto :error
)

echo Starting Adhyayan Learning System...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:4000
echo.

call npm start
if errorlevel 1 goto :error
exit /b 0

:error
echo.
echo Startup failed.
pause
exit /b 1

:clear_workspace_locks
if exist "node_modules\.package-lock.json" del /f /q "node_modules\.package-lock.json" >nul 2>nul
if exist "backend\node_modules\.package-lock.json" del /f /q "backend\node_modules\.package-lock.json" >nul 2>nul
if exist "frontend\node_modules\.package-lock.json" del /f /q "frontend\node_modules\.package-lock.json" >nul 2>nul
exit /b 0

:prepare_npm_workspace
call :clear_workspace_locks
if exist "node_modules\.pnpm" (
  echo Detected pnpm workspace metadata. Cleaning dependency folders for npm...
  if exist "package-lock.json" del /f /q "package-lock.json" >nul 2>nul
  if exist "backend\package-lock.json" del /f /q "backend\package-lock.json" >nul 2>nul
  if exist "frontend\package-lock.json" del /f /q "frontend\package-lock.json" >nul 2>nul
  if exist "node_modules" rmdir /s /q "node_modules"
  if exist "backend\node_modules" rmdir /s /q "backend\node_modules"
  if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
)
exit /b 0
