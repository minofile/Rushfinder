$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = 'http://127.0.0.1:18818'
$probe = "$base/ae-api/check"
$url = "$base/index.html?v=0805"
$version = '0805'
$expectedRoot = $root.Replace('\', '/').TrimEnd('/')

function Read-Engine {
    try { return Invoke-RestMethod -Uri $probe -TimeoutSec 2 -ErrorAction Stop }
    catch { return $null }
}
function Is-This-Engine($report) {
    if ($null -eq $report) { return $false }
    $actual = ([string]$report.installRoot).TrimEnd('/')
    return ([string]$report.version -eq $version -and $actual -ieq $expectedRoot)
}
function Is-Port-Busy {
    $socket = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $socket.BeginConnect('127.0.0.1', 18818, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(500)) { return $false }
        $socket.EndConnect($async)
        return $true
    } catch { return $false }
    finally { $socket.Close() }
}

if (-not (Test-Path -LiteralPath (Join-Path $root 'index.html') -PathType Leaf)) {
    Write-Host 'ERROR: index.html is missing from this folder.' -ForegroundColor Red
    exit 1
}

$report = Read-Engine
if (-not (Is-This-Engine $report)) {
    if (Is-Port-Busy) {
        Write-Host 'ERROR: Port 18818 is in use by another program or RushFinder copy.' -ForegroundColor Red
        Write-Host 'Close the old RushFinder engine and start this folder again.'
        exit 1
    }
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($null -eq $node) {
        Write-Host 'ERROR: Node.js was not found in PATH.' -ForegroundColor Red
        Write-Host 'Install Node.js (LTS), reopen Windows Explorer, and run this launcher again.'
        exit 1
    }
    Write-Host 'Starting RushFinder local engine...'
    try {
        $process = Start-Process -FilePath $node.Source -ArgumentList 'ae-auto-server.js' -WorkingDirectory $root -WindowStyle Hidden -PassThru -ErrorAction Stop
    } catch {
        Write-Host ('ERROR: Unable to start Node.js: ' + $_.Exception.Message) -ForegroundColor Red
        exit 1
    }
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        if (Is-This-Engine (Read-Engine)) { $ready = $true; break }
        if ($process.HasExited) { break }
    }
    if (-not $ready) {
        Write-Host 'ERROR: Local render engine did not become ready.' -ForegroundColor Red
        Write-Host 'Check for a blocked port or a missing Node.js dependency.'
        exit 1
    }
}
Write-Host 'Opening RushFinder index.html in the default browser...'
try {
    Start-Process -FilePath $url -ErrorAction Stop
} catch {
    Write-Host ('ERROR: The browser could not be opened: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host ('Open manually: ' + $url)
    exit 1
}
exit 0
