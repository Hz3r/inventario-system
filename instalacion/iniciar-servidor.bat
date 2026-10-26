@echo off
REM Arranca el sistema. Lo ejecuta la tarea programada "Bodega - Servidor" al prender la PC.
cd /d "%~dp0"
java -Xmx512m -Duser.timezone=America/Lima -jar inventario.jar >> logs\servidor.log 2>&1
