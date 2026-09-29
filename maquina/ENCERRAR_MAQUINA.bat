@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "try{$r=Invoke-RestMethod -Uri 'http://localhost:3080/api/me' -TimeoutSec 1; if($r.platform){$c=Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction Stop | Select-Object -First 1; if($c.OwningProcess){Stop-Process -Id $c.OwningProcess -Force; exit 0}}}catch{}; exit 1"
if errorlevel 1 (
  echo A Maquina nao parece estar em execucao.
) else (
  echo Maquina encerrada.
)
timeout /t 2 >nul
endlocal
