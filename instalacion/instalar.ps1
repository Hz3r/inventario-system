# ==================================================================
#  Instalador del sistema de la bodega (Windows 10/11)
#  Requisitos ya instalados: Java 21 (Temurin) y PostgreSQL 16/17.
#  Uso: clic derecho en INSTALAR.bat -> Ejecutar como administrador
# ==================================================================
$ErrorActionPreference = 'Stop'
$Origen  = $PSScriptRoot
$Destino = 'C:\Bodega'
$Puerto  = 8080

function Paso($texto) { Write-Host "`n>> $texto" -ForegroundColor Cyan }
function Clave($largo) {
    $chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    -join (1..$largo | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

# ---------- 1. Revisar Java y PostgreSQL ----------
Paso 'Buscando Java...'
$java = (Get-Command java -ErrorAction SilentlyContinue).Source
if (-not $java) { throw 'No se encontro Java. Instala Temurin 21 (marca "Add to PATH") y vuelve a intentar.' }
Write-Host "   $java"

Paso 'Buscando PostgreSQL...'
$pgBin = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
         Sort-Object FullName -Descending | Select-Object -First 1 | ForEach-Object { $_.DirectoryName }
if (-not $pgBin) { throw 'No se encontro PostgreSQL en C:\Program Files\PostgreSQL. Instalalo primero.' }
Write-Host "   $pgBin"

# ---------- 2. Copiar archivos ----------
# Si ya estaba instalado (actualizacion), primero se detiene el servidor para poder reemplazar el jar
if (Get-ScheduledTask -TaskName 'Bodega - Servidor' -ErrorAction SilentlyContinue) {
    Paso 'Deteniendo la version anterior...'
    Stop-ScheduledTask -TaskName 'Bodega - Servidor'
    Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
        Where-Object { $_.CommandLine -like '*inventario.jar*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    Start-Sleep -Seconds 2
}

Paso "Copiando el sistema a $Destino ..."
New-Item -ItemType Directory -Force -Path $Destino, "$Destino\logs", "$Destino\respaldos" | Out-Null
Copy-Item "$Origen\inventario.jar" $Destino -Force
Copy-Item "$Origen\respaldo.bat" $Destino -Force
# iniciar-servidor.bat con la ruta completa de Java (la tarea corre como SYSTEM)
(Get-Content "$Origen\iniciar-servidor.bat") -replace '^java ', "`"$java`" " |
    Set-Content -Encoding ASCII "$Destino\iniciar-servidor.bat"

# ---------- 3. Base de datos y configuracion (solo la primera vez) ----------
$config = "$Destino\application.properties"
if (Test-Path $config) {
    Paso 'Ya habia una instalacion: se conserva la configuracion y los datos.'
} else {
    Paso 'Creando la base de datos "inventario"...'
    $pgPass = Read-Host 'Contrasena del usuario "postgres" (la que pusiste al instalar PostgreSQL)' -AsSecureString
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPass))
    $dbPass = Clave 20
    & "$pgBin\psql.exe" -U postgres -h localhost -v ON_ERROR_STOP=1 -c "CREATE ROLE inventario LOGIN PASSWORD '$dbPass';"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el usuario (contrasena de postgres incorrecta, o ya existe).' }
    & "$pgBin\psql.exe" -U postgres -h localhost -v ON_ERROR_STOP=1 -c "CREATE DATABASE inventario OWNER inventario ENCODING 'UTF8';"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la base de datos.' }
    Remove-Item Env:PGPASSWORD

    Paso 'Escribiendo la configuracion (claves generadas al azar)...'
    @"
# Configuracion de ESTA instalacion. Spring la lee porque esta junto al jar.
spring.datasource.url=jdbc:postgresql://localhost:5432/inventario
spring.datasource.username=inventario
spring.datasource.password=$dbPass
server.port=$Puerto
app.jwt.secreto=$(Clave 48)
"@ | Set-Content -Encoding ASCII $config
    # el respaldo usa la misma clave
    "set PGPASSWORD=$dbPass" | Set-Content -Encoding ASCII "$Destino\clave-bd.bat"
}
"set PGBIN=$pgBin" | Set-Content -Encoding ASCII "$Destino\ruta-postgres.bat"

# ---------- 4. Arranque automatico al prender la PC ----------
Paso 'Programando el arranque automatico del servidor...'
$accion   = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$Destino\iniciar-servidor.bat`"" -WorkingDirectory $Destino
$inicio   = New-ScheduledTaskTrigger -AtStartup
$opciones = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
Register-ScheduledTask -TaskName 'Bodega - Servidor' -Action $accion -Trigger $inicio -Settings $opciones `
    -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

Paso 'Programando el respaldo diario de la base de datos (10:00 pm)...'
$accionR = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$Destino\respaldo.bat`"" -WorkingDirectory $Destino
$diario  = New-ScheduledTaskTrigger -Daily -At '22:00'
Register-ScheduledTask -TaskName 'Bodega - Respaldo' -Action $accionR -Trigger $diario `
    -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable) -User 'SYSTEM' -RunLevel Highest -Force | Out-Null

# ---------- 5. Permitir el acceso desde el celular (misma red WiFi) ----------
Paso "Abriendo el puerto $Puerto en el firewall (solo redes privadas)..."
if (-not (Get-NetFirewallRule -DisplayName 'Bodega 8080' -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName 'Bodega 8080' -Direction Inbound -Protocol TCP -LocalPort $Puerto `
        -Action Allow -Profile Private | Out-Null
}

# ---------- 6. Acceso directo en el escritorio (Chrome en modo caja) ----------
Paso 'Creando el acceso directo "Bodega" en el escritorio...'
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LocalAppData\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$wsh = New-Object -ComObject WScript.Shell
$acceso = $wsh.CreateShortcut("$([Environment]::GetFolderPath('CommonDesktopDirectory'))\Bodega.lnk")
if ($chrome) {
    # --kiosk-printing: imprime el ticket directo, sin mostrar el cuadro de impresion
    $acceso.TargetPath = $chrome
    $acceso.Arguments  = "--app=http://localhost:$Puerto --kiosk-printing --start-maximized"
} else {
    Write-Host '   (No se encontro Chrome: el acceso abrira el navegador por defecto, sin impresion silenciosa)' -ForegroundColor Yellow
    $acceso.TargetPath = "http://localhost:$Puerto"
}
$acceso.Save()

# ---------- 7. Arrancar ahora ----------
Paso 'Arrancando el servidor...'
Start-ScheduledTask -TaskName 'Bodega - Servidor'
$ok = $false
foreach ($i in 1..40) {
    Start-Sleep -Seconds 3
    try { if ((Invoke-WebRequest "http://localhost:$Puerto/actuator/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { $ok = $true; break } } catch {}
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
Write-Host ''
if ($ok) {
    Write-Host '==============================================' -ForegroundColor Green
    Write-Host ' INSTALADO. Abre el acceso "Bodega" del escritorio.' -ForegroundColor Green
    Write-Host '   Usuario: admin@tienda.com   Clave: 123456'
    Write-Host '   (cambiala en Configuraciones > Seguridad)'
    if ($ip) { Write-Host "   Desde el celular (mismo WiFi): http://${ip}:$Puerto" }
    Write-Host '==============================================' -ForegroundColor Green
} else {
    Write-Host "El servidor no respondio todavia. Revisa $Destino\logs\servidor.log" -ForegroundColor Yellow
}
