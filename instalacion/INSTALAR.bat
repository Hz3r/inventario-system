@echo off
REM Lanza el instalador de PowerShell (pedir "Ejecutar como administrador")
net session >nul 2>&1 || (echo Clic derecho en INSTALAR.bat -^> "Ejecutar como administrador" & pause & exit /b 1)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
pause
