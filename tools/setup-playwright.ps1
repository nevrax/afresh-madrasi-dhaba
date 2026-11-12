$ErrorActionPreference = 'Stop'
$repoPath = Split-Path $PSScriptRoot -Parent
$toolInfo = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'playwright.json') -Raw | ConvertFrom-Json
$installPath = Join-Path $repoPath $toolInfo.installDirectory
$packagePath = Join-Path $installPath 'node_modules/playwright/package.json'
if ((Test-Path -LiteralPath $packagePath) -and (Test-Path -LiteralPath (Join-Path $installPath 'node_modules/playwright-core/package.json'))) {
    $installed = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    if ($installed.version -eq $toolInfo.version) { Write-Host "Playwright $($toolInfo.version) is already ready."; return }
}
$env:NPM_CONFIG_CACHE = Join-Path $repoPath '.local-setup/downloads/npm-cache'
$env:NPM_CONFIG_LOGS_DIR = Join-Path $repoPath '.local-setup/logs/npm'
New-Item -ItemType Directory -Force -Path $installPath | Out-Null
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
& npm install --prefix $installPath --ignore-scripts --no-audit --no-fund "playwright@$($toolInfo.version)"
if ($LASTEXITCODE -ne 0) { throw 'Playwright installation failed.' }
Write-Host 'Playwright is ready in .local-setup/playwright; tests use an existing Chrome installation.'
