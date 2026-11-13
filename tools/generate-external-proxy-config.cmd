@echo off
rem Resolve the companion script relative to this tools directory.
setlocal
rem Avoid inheriting incompatible PowerShell 7 module paths into Windows PowerShell.
set "PSModulePath="
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0generate-external-proxy-config.ps1"
exit /b %errorlevel%
