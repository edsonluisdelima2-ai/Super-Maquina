param([string]$TargetPath)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath $PSScriptRoot).Path.TrimEnd('\')
try {
    if (-not $TargetPath) {
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = 'Selecione a pasta da Super Máquina que já contém seus dados'
        $dialog.ShowNewFolderButton = $false
        if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 1 }
        $TargetPath = $dialog.SelectedPath
    }
    $target = (Resolve-Path -LiteralPath $TargetPath).Path.TrimEnd('\')
    if ($target -eq $source) { throw 'Abra este atualizador a partir da nova versão extraída e escolha a instalação antiga.' }
    if (-not (Test-Path -LiteralPath (Join-Path $target 'server.js'))) { throw 'A pasta escolhida não é uma instalação da Super Máquina.' }
    $targetData = Join-Path $target 'data'
    if (-not ((Test-Path -LiteralPath (Join-Path $targetData 'state.sqlite')) -or (Test-Path -LiteralPath (Join-Path $targetData 'state.json')))) { throw 'Os dados da instalação não foram encontrados. Nada foi alterado.' }
    if (Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue) { throw 'Encerre a Super Máquina antes de atualizar.' }
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss_fff'
    $parent = Split-Path -Parent $target
    $leaf = Split-Path -Leaf $target
    $backup = Join-Path $parent ($leaf + '_backup_antes_0_5_0_' + $stamp + '.zip')
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($target, $backup, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    if (-not (Test-Path -LiteralPath $backup)) { throw 'Não foi possível confirmar o backup. Atualização cancelada.' }
    $stage = Join-Path $parent ($leaf + '_preparacao_0_5_0_' + $stamp)
    Copy-Item -LiteralPath $target -Destination $stage -Recurse
    foreach ($item in Get-ChildItem -LiteralPath $source -Force) {
        if ($item.Name -eq 'data') { continue }
        $dest = Join-Path $stage $item.Name
        if ($item.PSIsContainer) {
            if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }
            foreach ($child in Get-ChildItem -LiteralPath $item.FullName -Force) { Copy-Item -LiteralPath $child.FullName -Destination $dest -Recurse -Force }
        } else { Copy-Item -LiteralPath $item.FullName -Destination $dest -Force }
    }
    & (Get-Command node).Source --check (Join-Path $stage 'server.js')
    if ($LASTEXITCODE -ne 0) { throw 'A nova versão não passou na verificação. A instalação original permanece intacta.' }
    $old = Join-Path $parent ($leaf + '_anterior_0_5_0_' + $stamp)
    Move-Item -LiteralPath $target -Destination $old
    try { Move-Item -LiteralPath $stage -Destination $target } catch { Move-Item -LiteralPath $old -Destination $target; throw }
    Write-Host "Atualização concluída. Seus dados permaneceram na pasta data."
    Write-Host "Backup: $backup"
    Write-Host "Versão anterior: $old"
} catch { Write-Host $_.Exception.Message; exit 1 }

