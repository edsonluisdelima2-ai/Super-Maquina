$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
try {
    if (-not (Test-Path -LiteralPath 'runtime/ffmpeg.exe')) { throw 'FFmpeg não veio neste pacote. Extraia novamente o ZIP completo.' }
    if (Test-Path -LiteralPath 'runtime/python-standalone/python.exe') {
        $python = 'runtime/python-standalone/python.exe'
    } elseif (-not (Test-Path -LiteralPath 'runtime/python/Scripts/python.exe')) {
        python -m venv runtime/python
        if ($LASTEXITCODE -ne 0) { throw 'Instale Python 3.11 ou superior e execute novamente.' }
        $python = 'runtime/python/Scripts/python.exe'
    } else {
        $python = 'runtime/python/Scripts/python.exe'
    }
    & $python -m pip install -r requirements-video.txt
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível baixar a transcrição. Verifique sua conexão e tente novamente.' }
    & $python -c "from faster_whisper.utils import download_model; download_model('small', output_dir='runtime/models/small')"
    if ($LASTEXITCODE -ne 0) { throw 'Modelo ainda não disponível. Verifique a conexão e tente novamente.' }
    Write-Host 'Motor de vídeo e transcrição prontos. Você pode abrir a Máquina.'
} catch { Write-Host $_.Exception.Message; exit 1 }

