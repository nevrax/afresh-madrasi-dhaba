# Text generation only. No application imports, process inspection or network calls.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$temporaryPath = $null
$stage = 'checking private paths'
function Protect-PrivatePath([string]$Path, [bool]$Directory = $false) {
    # Windows ACL: current operator and SYSTEM only; no inherited broad access.
    # Preserve ownership; modify only access rules, without requesting ownership privileges.
    $sections = [Security.AccessControl.AccessControlSections]::Access
    if ($PSVersionTable.PSEdition -eq 'Desktop') {
        $acl = if ($Directory) { [IO.Directory]::GetAccessControl($Path, $sections) } else { [IO.File]::GetAccessControl($Path, $sections) }
    } else {
        $info = if ($Directory) { [IO.DirectoryInfo]::new($Path) } else { [IO.FileInfo]::new($Path) }
        $acl = [IO.FileSystemAclExtensions]::GetAccessControl($info, $sections)
    }
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($rule in @($acl.GetAccessRules($true, $false, [Security.Principal.SecurityIdentifier]))) {
        $acl.RemoveAccessRuleSpecific($rule)
    }
    $operator = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
    foreach ($sid in @($operator, $system)) {
        if ($Directory) {
            $rule = [Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        } else {
            $rule = [Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'Allow')
        }
        $acl.AddAccessRule($rule)
    }
    if ($PSVersionTable.PSEdition -eq 'Desktop') {
        if ($Directory) { [IO.Directory]::SetAccessControl($Path, $acl) } else { [IO.File]::SetAccessControl($Path, $acl) }
    } else {
        [IO.FileSystemAclExtensions]::SetAccessControl($info, $acl)
    }
}
try {
    $projectRoot = Split-Path $PSScriptRoot -Parent
    $envPath = Join-Path $projectRoot '.env'
    $outputDirectory = Join-Path $projectRoot 'config'
    $outputPath = Join-Path $outputDirectory 'external-proxy.generated.yaml'
    # Reject reparse points before applying permissions or writing through paths.
    foreach ($path in @($envPath, $outputDirectory, $outputPath)) {
        if ((Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Invalid path.' }
    }
    if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) { throw 'Missing configuration.' }
    $stage = 'protecting application ENV'
    Protect-PrivatePath $envPath
    $stage = 'reading application ENV'
    $keys = @('MADRASI_PORT', 'MADRASI_PATH', 'MADRASI_REFERENCE_PORT', 'MADRASI_REFERENCE_PATH', 'MADRASI_PUBLIC_ORIGIN')
    $values = @{}
    foreach ($raw in [IO.File]::ReadAllLines($envPath)) {
        $line = $raw.Trim()
        if (-not $line -or $line.StartsWith('#')) { continue }
        if ($line -cnotmatch '^([A-Z][A-Z0-9_]*)=([^\r\n]+)$') { throw 'Invalid configuration.' }
        $key = $Matches[1]; $value = $Matches[2].Trim()
        if ($keys -cnotcontains $key -or $values.ContainsKey($key)) { throw 'Invalid configuration.' }
        $values[$key] = $value
    }
    $stage = 'validating required settings'
    foreach ($key in $keys) { if (-not $values[$key]) { throw 'Missing configuration.' } }
    foreach ($key in @('MADRASI_PORT', 'MADRASI_REFERENCE_PORT')) {
        if ($values[$key] -cnotmatch '^90(?:0[0-9]|1[0-9])$') { throw 'Invalid application port.' }
    }
    foreach ($key in @('MADRASI_PATH', 'MADRASI_REFERENCE_PATH')) {
        if ($values[$key] -cnotmatch '^/(?:[a-z0-9]+(?:-[a-z0-9]+)*/)+$') { throw 'Invalid complete path.' }
    }
    $main = $values.MADRASI_PATH; $reference = $values.MADRASI_REFERENCE_PATH
    if ($values.MADRASI_PORT -eq $values.MADRASI_REFERENCE_PORT -or $main.Split('/').Count -ne 3 -or $reference -cne ($main + 'reference/')) { throw 'Conflicting components.' }
    $stage = 'validating public origin'
    $origin = [uri]$values.MADRASI_PUBLIC_ORIGIN
    if (-not $origin.IsAbsoluteUri -or $origin.Scheme -notin @('http', 'https') -or $origin.UserInfo -or $origin.GetLeftPart([UriPartial]::Authority) -cne $values.MADRASI_PUBLIC_ORIGIN) { throw 'Invalid public origin.' }
    $mainBare = $main.TrimEnd('/'); $referenceBare = $reference.TrimEnd('/')
    # Parent excludes the entire reference subtree explicitly. No priorities.
    $mainRule = '(Path(`{0}`) || PathPrefix(`{1}`)) && !(Path(`{2}`) || PathPrefix(`{3}`))' -f $mainBare, $main, $referenceBare, $reference
    $referenceRule = 'Path(`{0}`) || PathPrefix(`{1}`)' -f $referenceBare, $reference
    $yaml = @"
# Generated from the application .env. Private; do not commit.
# Central external authentication is mandatory on BOTH routers and every path.
# No authentication, TLS termination or public Host configuration is defined here.
# Game service includes catalogue, verification, assets and both distributions.
# Reference service includes Ruffle, SWFs and optional probe resources.
http:
  routers:
    madrasi-game:
      rule: '$mainRule'
      service: madrasi-game
    madrasi-reference:
      rule: '$referenceRule'
      service: madrasi-reference
  services:
    madrasi-game:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: 'http://127.0.0.1:$($values.MADRASI_PORT)'
    madrasi-reference:
      loadBalancer:
        passHostHeader: true
        servers:
          - url: 'http://127.0.0.1:$($values.MADRASI_REFERENCE_PORT)'
"@
    $stage = 'protecting output directory'
    if (-not (Test-Path -LiteralPath $outputDirectory)) { [IO.Directory]::CreateDirectory($outputDirectory) | Out-Null }
    Protect-PrivatePath $outputDirectory $true
    if (Test-Path -LiteralPath $outputPath) { Protect-PrivatePath $outputPath }
    $stage = 'writing protected temporary output'
    $temporaryPath = Join-Path $outputDirectory ('external-proxy.' + [guid]::NewGuid().ToString('N') + '.tmp')
    # The temporary file inherits the already restrictive directory ACL at creation.
    $stream = [IO.File]::Open($temporaryPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
        $bytes = [Text.UTF8Encoding]::new($false).GetBytes($yaml.Replace("`r`n", "`n") + "`n")
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Flush($true)
    } finally { $stream.Dispose() }
    Protect-PrivatePath $temporaryPath
    $stage = 'replacing generated output'
    if (Test-Path -LiteralPath $outputPath) { [IO.File]::Replace($temporaryPath, $outputPath, [System.Management.Automation.Language.NullString]::Value) }
    else { [IO.File]::Move($temporaryPath, $outputPath) }
    $temporaryPath = $null
    Write-Output 'Generated config/external-proxy.generated.yaml. No services were inspected or started.'
    exit 0
} catch {
    if ($temporaryPath -and (Test-Path -LiteralPath $temporaryPath)) {
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
    }
    [Console]::Error.WriteLine('Proxy configuration generation failed while ' + $stage + ' (' + $_.Exception.GetType().Name + '). Check .env and private file permissions. Previous output was preserved.')
    exit 1
}
