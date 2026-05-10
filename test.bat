@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found on this PC.
  pause
  exit /b 1
)

call npm test
if errorlevel 1 (
  echo.
  echo Tests failed.
  pause
  exit /b 1
)

echo.
echo Tests passed.
pause
