$ErrorActionPreference = 'Stop'
$repoPath = Split-Path $PSScriptRoot -Parent
$toolInfo = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'typescript.json') -Raw | ConvertFrom-Json
$downloadPath = Join-Path $repoPath '.local-setup/downloads'
$installPath = Join-Path $repoPath $toolInfo.installDirectory
if ((Test-Path -LiteralPath (Join-Path $installPath 'lib/tsc.js')) -and (Test-Path -LiteralPath (Join-Path $installPath 'package.json'))) {
    $installed = Get-Content -LiteralPath (Join-Path $installPath 'package.json') -Raw | ConvertFrom-Json
    if ($installed.version -eq $toolInfo.version) { Write-Host "TypeScript $($toolInfo.version) is already ready."; return }
}
New-Item -ItemType Directory -Force -Path $downloadPath, $installPath | Out-Null
$archivePath = Join-Path $downloadPath "typescript-$($toolInfo.version).tgz"
if (!(Test-Path -LiteralPath $archivePath)) {
    Invoke-WebRequest -Uri $toolInfo.url -OutFile $archivePath
}
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $toolInfo.sha256) {
    throw 'TypeScript archive checksum mismatch.'
}
& tar -xzf $archivePath -C $installPath --strip-components=1
if ($LASTEXITCODE -ne 0) { throw 'TypeScript extraction failed.' }
Write-Host "TypeScript $($toolInfo.version) is ready in .local-setup/typescript."
