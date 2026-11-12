$ErrorActionPreference = 'Stop'
$repoPath = Split-Path $PSScriptRoot -Parent
$toolInfo = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'ruffle.json') -Raw | ConvertFrom-Json
$downloadPath = Join-Path $repoPath '.local-setup/downloads'
$installPath = Join-Path $repoPath $toolInfo.installDirectory
New-Item -ItemType Directory -Force -Path $downloadPath, $installPath | Out-Null
$archivePath = Join-Path $downloadPath "ruffle-$($toolInfo.version).tgz"
if (!(Test-Path -LiteralPath $archivePath)) {
    Invoke-WebRequest -Uri $toolInfo.url -OutFile $archivePath
}
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $toolInfo.sha256) {
    throw 'Ruffle archive checksum mismatch.'
}
& tar -xzf $archivePath -C $installPath --strip-components=1
if ($LASTEXITCODE -ne 0) { throw 'Ruffle extraction failed.' }
Write-Host "Ruffle $($toolInfo.version) is ready in .local-setup/ruffle."
