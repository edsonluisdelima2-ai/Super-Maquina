@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Super Maquina de Conteudo - Lite v0.5.0 teste

echo.
echo ============================================================
echo   SUPER MAQUINA DE CONTEUDO - LITE v0.5.0 TESTE
echo ============================================================

if not exist "%~dp0server.js" (
  echo ERRO: server.js nao foi encontrado.
  pause
  goto :fim
)

for %%D in (data data\media data\exports data\produced data\backups) do if not exist "%~dp0%%D" mkdir "%~dp0%%D" >nul 2>&1

where node >nul 2>&1
if errorlevel 1 goto :installnode
for /f "tokens=1 delims=." %%M in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%M"
if !NODE_MAJOR! LSS 22 goto :installnode
for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
for /f "delims=" %%V in ('"%NODE_EXE%" -v') do set "NODE_VER=%%V"
echo Node: !NODE_VER!
echo Banco: SQLite local

set "PORT=3081"

if exist "%~dp0data\servidor.log" del /Q "%~dp0data\servidor.log" >nul 2>&1
if exist "%~dp0data\servidor_erro.log" del /Q "%~dp0data\servidor_erro.log" >nul 2>&1
set "SMC_NODE=%NODE_EXE%"
set "SMC_ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$node=$env:SMC_NODE; $root=$env:SMC_ROOT; $env:PORT='3081'; $out=Join-Path $root 'data\servidor.log'; $err=Join-Path $root 'data\servidor_erro.log'; Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err"
if errorlevel 1 goto :erro
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ok=$false; for($i=0;$i -lt 40;$i++){try{$r=Invoke-RestMethod -Uri 'http://localhost:3081/api/me' -TimeoutSec 1; if($r.appVersion -eq '0.5.0'){$ok=$true;break}}catch{}; Start-Sleep -Milliseconds 300}; if($ok){exit 0}else{exit 1}"
if errorlevel 1 goto :erro
start "" "http://localhost:3081"
echo Lite iniciada em http://localhost:3081. Seus dados ficam na pasta data.
timeout /t 3 >nul
goto :fim

:installnode
echo.
echo A v0.5.0 precisa do Node.js 22 ou superior para o banco SQLite local.
where winget >nul 2>&1
if errorlevel 1 (
  start "" "https://nodejs.org/"
  pause
  goto :fim
)
choice /C SN /N /M "Deseja instalar/atualizar o Node.js LTS agora? [S/N]: "
if errorlevel 2 goto :fim
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
echo Feche esta janela e execute novamente INICIAR_MAQUINA.bat.
pause
goto :fim

:erro
echo.
echo A MAQUINA NAO CONSEGUIU INICIAR. Nenhum dado foi apagado.
if exist "%~dp0data\servidor_erro.log" type "%~dp0data\servidor_erro.log"
pause
:fim
endlocal

