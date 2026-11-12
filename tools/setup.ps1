param([switch]$ToolsOnly, [switch]$NoPause)
$ErrorActionPreference = 'Stop'
$repoPath = Split-Path $PSScriptRoot -Parent
$localPath = Join-Path $repoPath '.local-setup'
$nodePath = Join-Path $localPath 'node'
$nodeExe = Join-Path $nodePath 'node.exe'
$resultCode = 0
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $nodeInfo = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'node.json') -Raw | ConvertFrom-Json
    $machineArchitecture = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
    $architecture = switch ($machineArchitecture.ToUpperInvariant()) { 'AMD64' { 'x64' }; 'ARM64' { 'arm64' }; default { throw 'Windows x64 or ARM64 is required.' } }
    $installedVersion = if (Test-Path -LiteralPath $nodeExe) { & $nodeExe --version } else { '' }
    if ($installedVersion -ne "v$($nodeInfo.version)") {
        $archiveName = "node-v$($nodeInfo.version)-win-$architecture.zip"
        $downloadPath = Join-Path $localPath 'downloads'
        New-Item -ItemType Directory -Force -Path $downloadPath, $nodePath | Out-Null
        $archivePath = Join-Path $downloadPath $archiveName
        if (-not (Test-Path -LiteralPath $archivePath)) {
            Write-Host "Downloading local Node.js $($nodeInfo.version)..."
            $partialPath = "$archivePath.partial"
            Invoke-WebRequest -Uri ($nodeInfo.baseUrl + $archiveName) -OutFile $partialPath -UseBasicParsing
            if ((Get-FileHash -LiteralPath $partialPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $nodeInfo.sha256.$architecture) { throw 'Node.js download checksum mismatch.' }
            Move-Item -LiteralPath $partialPath -Destination $archivePath -Force
        }
        if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $nodeInfo.sha256.$architecture) { throw 'Cached Node.js checksum mismatch. Remove that archive from .local-setup/downloads and retry.' }
        & tar.exe -xf $archivePath -C $nodePath --strip-components=1
        if ($LASTEXITCODE -ne 0) { throw 'Node.js extraction failed.' }
        if ((& $nodeExe --version) -ne "v$($nodeInfo.version)") { throw 'Local Node.js did not start correctly.' }
    }
    $env:PATH = $nodePath + [IO.Path]::PathSeparator + $env:PATH
    $env:NPM_CONFIG_CACHE = Join-Path $localPath 'downloads/npm-cache'
    $env:NPM_CONFIG_LOGS_DIR = Join-Path $localPath 'logs/npm'
    $env:NPM_CONFIG_UPDATE_NOTIFIER = 'false'
    $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $localPath 'browsers'
    & (Join-Path $PSScriptRoot 'setup-typescript.ps1')
    & (Join-Path $PSScriptRoot 'setup-playwright.ps1')
    $browserPaths = @((Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'), (Join-Path $env:LOCALAPPDATA 'Google/Chrome/Application/chrome.exe'))
    if ($env:PLAYWRIGHT_CHROME) { $browserPaths += $env:PLAYWRIGHT_CHROME }
    if (-not ($browserPaths | Where-Object { Test-Path -LiteralPath $_ })) {
        Write-Host 'Installing a local test browser...'
        & $nodeExe (Join-Path $localPath 'playwright/node_modules/playwright/cli.js') install chromium
        if ($LASTEXITCODE -ne 0) { throw 'Test browser setup failed.' }
    }
    if (-not $ToolsOnly) {
        Push-Location $repoPath
        try { & $nodeExe scripts/internal/release.mjs; if ($LASTEXITCODE -ne 0) { throw 'Build failed.' } } finally { Pop-Location }
    }
    Write-Host 'Ready. Use scripts/20_play.cmd, scripts/40_build.cmd, scripts/50_test.cmd or scripts/30_open-catalog.cmd.'
    Write-Host 'Tools and intermediate files stay in .local-setup. No global installation is needed.'
} catch {
    Write-Host "Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    $resultCode = 1
}
if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
exit $resultCode
