@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ============================================================
echo   REDEFINIR SENHA ADMINISTRATIVA
 echo ============================================================
echo.
echo Isto NAO apaga clientes, conteudos, links, chaves ou configuracoes.
echo Apenas remove o hash da senha atual.
echo.
choice /C SN /N /M "Deseja continuar? [S/N]: "
if errorlevel 2 goto :fim
call ENCERRAR_MAQUINA.bat >nul 2>&1
if exist "data\admin_auth.json" (
  copy /Y "data\admin_auth.json" "data\admin_auth.backup.json" >nul
  del /Q "data\admin_auth.json"
)
echo.
echo Senha liberada para redefinicao.
echo Execute INICIAR_MAQUINA.bat. A tela pedira uma nova senha.
pause
:fim
endlocal
