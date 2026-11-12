param([switch]$Check)
$ErrorActionPreference = 'Stop'
$tool = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'ffdec.json') -Raw | ConvertFrom-Json
$repoRoot = Split-Path -Parent $PSScriptRoot
$localSetup = Join-Path $repoRoot '.local-setup'
$archivePath = Join-Path $localSetup $tool.archive
$installPath = Join-Path $localSetup $tool.directory
if (-not (Test-Path -LiteralPath $archivePath)) {
    if ($Check) { throw 'The cached JPEXS archive is missing.' }
    New-Item -ItemType Directory -Path (Split-Path -Parent $archivePath) -Force | Out-Null
    Invoke-WebRequest -Uri $tool.url -OutFile $archivePath -UseBasicParsing
}
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $tool.sha256) {
    throw 'JPEXS archive checksum mismatch. Installation stopped.'
}
if ($Check) {
    if (-not (Test-Path -LiteralPath (Join-Path $installPath 'ffdec.jar'))) { throw 'JPEXS is not installed.' }
    Write-Output "JPEXS $($tool.version): archive checksum and installation paths verified."
    exit 0
}
Expand-Archive -LiteralPath $archivePath -DestinationPath $installPath -Force
Write-Output "JPEXS $($tool.version) is ready. Open 31_open-resources.cmd in the scripts folder."
