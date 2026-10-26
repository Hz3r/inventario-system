@echo off
REM Copia de seguridad diaria de la base de datos. Guarda los ultimos 30 dias.
cd /d "%~dp0"
call ruta-postgres.bat
call clave-bd.bat
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set FECHA=%%i
"%PGBIN%\pg_dump.exe" -U inventario -h localhost -F c -f "respaldos\inventario_%FECHA%.backup" inventario
powershell -NoProfile -Command "Get-ChildItem respaldos\*.backup | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item"
