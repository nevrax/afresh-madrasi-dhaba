@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\tools\setup.ps1" %*
exit /b %errorlevel%
