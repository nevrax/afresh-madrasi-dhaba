@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\tools\run.ps1" -Action nvidia %*
exit /b %errorlevel%
