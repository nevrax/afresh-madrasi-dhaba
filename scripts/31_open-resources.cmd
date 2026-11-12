@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\open-resources.ps1" %*
if errorlevel 1 (
  echo.
  echo Unable to open the resource viewer. See the message above.
  pause
  exit /b 1
)
