param([Parameter(Mandatory=$true)][ValidateSet('play','catalog','nvidia','build','test')][string]$Action, [switch]$NoPause)
$ErrorActionPreference = 'Stop'
$repoPath = Split-Path $PSScriptRoot -Parent
$nodeExe = Join-Path $repoPath '.local-setup/node/node.exe'
$resultCode = 0
try {
    $missingBrowserTools = $Action -eq 'nvidia' -and -not (Test-Path -LiteralPath (Join-Path $repoPath '.local-setup/playwright/node_modules/playwright/package.json'))
    if ($missingBrowserTools -or -not (Test-Path -LiteralPath $nodeExe) -or -not (Test-Path -LiteralPath (Join-Path $repoPath '.local-setup/typescript/lib/tsc.js'))) {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'setup.ps1') -ToolsOnly -NoPause
        if ($LASTEXITCODE -ne 0) { throw 'Setup failed. Run scripts/10_setup.cmd to retry.' }
    }
    $env:PATH = (Split-Path $nodeExe) + [IO.Path]::PathSeparator + $env:PATH
    Push-Location $repoPath
    try {
        switch ($Action) {
            'build' { & $nodeExe scripts/internal/release.mjs }
            'test' { & $nodeExe scripts/internal/test.mjs }
            default {
                & $nodeExe scripts/internal/build.mjs
                if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
                switch ($Action) {
                    'play' { & $nodeExe scripts/internal/serve.mjs --open }
                    'catalog' { & $nodeExe scripts/internal/serve.mjs --open-catalog }
                    'nvidia' { & $nodeExe tools/performance-browser.mjs high-performance play nvidia-game }
                }
            }
        }
        $resultCode = $LASTEXITCODE
    } finally { Pop-Location }
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; $resultCode = 1 }
if (-not $NoPause -and ($resultCode -ne 0 -or $Action -in @('build','test'))) { Read-Host 'Press Enter to close' | Out-Null }
exit $resultCode
