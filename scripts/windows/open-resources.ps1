param(
    [ValidateSet('original', 'extended')][string]$Variant = 'extended',
    [switch]$Check
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$jarPath = Join-Path $repoRoot '.local-setup/ffdec/ffdec.jar'
$swfPath = Join-Path $repoRoot "reference/swf/$Variant.swf"
if (-not (Test-Path -LiteralPath $jarPath)) { throw 'JPEXS is missing. Run tools/setup-ffdec.ps1 first.' }
if (-not (Test-Path -LiteralPath $swfPath)) { throw "Reference SWF missing: $swfPath" }
$candidates = @()
if ($env:JAVA_HOME) { $candidates += Join-Path $env:JAVA_HOME 'bin/javaw.exe' }
$javaCommand = Get-Command javaw.exe -ErrorAction SilentlyContinue
if ($javaCommand) { $candidates += $javaCommand.Source }
foreach ($programRoot in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
    if (-not $programRoot) { continue }
    foreach ($vendor in @('Java', 'Eclipse Adoptium', 'Microsoft')) {
        $vendorRoot = Join-Path $programRoot $vendor
        foreach ($install in @(Get-ChildItem -LiteralPath $vendorRoot -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending)) {
            $candidates += Join-Path $install.FullName 'bin/javaw.exe'
        }
    }
}
$javaPath = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $javaPath) { throw 'Java was not found. Install a Java runtime or set JAVA_HOME.' }
if ($Check) {
    [pscustomobject]@{ Variant=$Variant; Java=$javaPath; Viewer=$jarPath; SWF=$swfPath } | Format-List | Out-Host
    exit 0
}
# The viewer is an interactive application the user needs to see.
Start-Process -FilePath $javaPath -ArgumentList @('-jar', ('"' + $jarPath + '"'), ('"' + $swfPath + '"')) -WorkingDirectory $repoRoot -WindowStyle Normal
