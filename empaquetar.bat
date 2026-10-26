@echo off
REM ==================================================================
REM  Arma la carpeta "paquete-bodega" para copiar a la mini PC (USB).
REM  Se corre en la laptop de desarrollo, en la raiz del proyecto.
REM ==================================================================
setlocal
cd /d "%~dp0"

echo.
echo [1/3] Construyendo la pagina web (React)...
cd Frontend
call npm run build || goto :error
cd ..

echo.
echo [2/3] Construyendo el backend con la pagina adentro...
cd backend
call mvnw.cmd -q -B -DskipTests clean package || goto :error
cd ..

echo.
echo [3/3] Copiando al paquete...
if exist paquete-bodega rmdir /s /q paquete-bodega
mkdir paquete-bodega
copy /y backend\target\inventario.jar paquete-bodega\ >nul || goto :error
xcopy /y /q instalacion\* paquete-bodega\ >nul || goto :error

echo.
echo LISTO. Copia la carpeta "paquete-bodega" a un USB.
echo En la mini PC sigue el archivo LEEME.txt
exit /b 0

:error
echo.
echo *** Algo fallo. Revisa el mensaje de arriba. ***
exit /b 1
