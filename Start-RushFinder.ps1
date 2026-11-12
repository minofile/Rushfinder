$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = 'http://127.0.0.1:18827'
$probe = "$base/ae-api/check"
$url = "$base/index.html?v=0843"
$version = '0813'  # API compatibility; render engine build is checked separately
$expectedBuild = '0819-channel-size-control'
$expectedRoleBuild = '0829-role-expression-edit-fix'
$expectedMashhadBuild = '0830-mashhad-three-models'  # Check the new Mashhad engine separately
$expectedRoot = $root.Replace('\', '/').TrimEnd('/')

function Read-Engine {
    try { return Invoke-RestMethod -Uri $probe -TimeoutSec 2 -ErrorAction Stop }
    catch { return $null }
}
function Is-This-Engine($report) {
    if ($null -eq $report) { return $false }
    $actual = ([string]$report.installRoot).TrimEnd('/')
    return ([string]$report.version -eq $version -and $actual -ieq $expectedRoot -and [string]$report.engineBuild -eq $expectedBuild -and [string]$report.roleBuild -eq $expectedRoleBuild -and [string]$report.mashhadBuild -eq $expectedMashhadBuild -and $report.webOriginAllowed -eq $true)
}
function Is-Port-Busy {
    $socket = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $socket.BeginConnect('127.0.0.1', 18827, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(500)) { return $false }
        $socket.EndConnect($async)
        return $true
    } catch { return $false }
    finally { $socket.Close() }
}

function Stop-Outdated-RushFinder($report) {
    if ($null -eq $report) { return $false }
    $actual = ([string]$report.installRoot).TrimEnd('/')
    if ($actual -ine $expectedRoot -or [string]$report.version -ne '0813') { return $false }
    try {
        $listener = Get-NetTCPConnection -LocalPort 18827 -State Listen -ErrorAction Stop |
            Where-Object { $_.LocalAddress -eq '127.0.0.1' } |
            Select-Object -First 1
        if ($null -eq $listener) { throw 'No RushFinder listener on 127.0.0.1:18827.' }
        $ownerPid = [int]$listener.OwningProcess
        $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerPid" -ErrorAction Stop
        if ($null -eq $owner -or $owner.Name -ine 'node.exe' -or
            [string]$owner.CommandLine -notmatch 'ae-auto-server[.]js') {
            throw 'The port owner was not verified as the RushFinder Node.js process.'
        }
        Write-Host 'An outdated RushFinder engine from this folder was found. Restarting it...' -ForegroundColor Yellow
        Stop-Process -Id $ownerPid -Force -ErrorAction Stop
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Milliseconds 200
            if (-not (Is-Port-Busy)) { return $true }
        }
        throw 'The old engine has not released port 18827.'
    } catch {
        Write-Host ('ERROR: Could not restart the outdated RushFinder engine: ' + $_.Exception.Message) -ForegroundColor Red
        Write-Host 'Close the old RushFinder/Node process, then run Start-RushFinder.cmd again.'
        return $false
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $root 'index.html') -PathType Leaf)) {
    Write-Host 'ERROR: index.html is missing from this folder.' -ForegroundColor Red
    exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'video-compress.html') -PathType Leaf)) {
    Write-Host 'ERROR: video-compress.html is missing. Extract the full RushFinder 0837 ZIP into one folder.' -ForegroundColor Red
    exit 1
}

$report = Read-Engine
if ($null -ne $report -and -not (Is-This-Engine $report)) {
    $actual = ([string]$report.installRoot).TrimEnd('/')
    if ($actual -ieq $expectedRoot -and [string]$report.version -eq '0813') {
        if (-not (Stop-Outdated-RushFinder $report)) { exit 1 }
        $report = $null
    }
}
if (-not (Is-This-Engine $report)) {
    if (Is-Port-Busy) {
        Write-Host 'ERROR: Port 18827 is in use by another program or RushFinder copy.' -ForegroundColor Red
        if ($null -ne $report -and [string]$report.installRoot) {
            Write-Host ('Currently running folder: ' + [string]$report.installRoot) -ForegroundColor Yellow
            Write-Host ('Requested new folder: ' + $expectedRoot) -ForegroundColor Yellow
        }
        Write-Host 'Close the old RushFinder engine (or restart Windows), then launch Start-RushFinder.cmd in this new folder.'
        exit 1
    }
    $portableNode = Join-Path $root 'tools\node\node.exe'
    $nodeExe = $null
    if (Test-Path -LiteralPath $portableNode -PathType Leaf) { $nodeExe = $portableNode }
    if (-not $nodeExe) {
        $node = Get-Command node.exe -ErrorAction SilentlyContinue
        if ($null -ne $node) { $nodeExe = $node.Source }
    }
    if (-not $nodeExe) {
        Write-Host 'ERROR: Node.js is not installed on THIS computer.' -ForegroundColor Red
        Write-Host 'Install the Windows LTS version from https://nodejs.org/en/download/' -ForegroundColor Yellow
        Write-Host 'Or place the official Windows node.exe in tools\node\node.exe next to the launcher.'
        Write-Host 'After installation, close this window and run Start-RushFinder.cmd again.'
        exit 1
    }
    $logs = Join-Path $env:LOCALAPPDATA 'RushFinder\logs'
    if (-not $env:LOCALAPPDATA) { $logs = Join-Path $env:TEMP 'RushFinder\logs' }
    New-Item -Path $logs -ItemType Directory -Force | Out-Null
    $logStdout = Join-Path $logs 'news-tag-server-stdout.log'
    $logStderr = Join-Path $logs 'news-tag-server-stderr.log'
    # Start-Process redirection requires distinct paths.
    Write-Host ('Starting RushFinder local engine with: ' + $nodeExe)
    Write-Host ('Server logs: ' + $logs)
    try {
        $process = Start-Process -FilePath $nodeExe -ArgumentList 'ae-auto-server.js' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $logStdout -RedirectStandardError $logStderr -PassThru -ErrorAction Stop
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
        Write-Host 'ERROR: Local news-tag engine did not become ready.' -ForegroundColor Red
        Write-Host ('Expected endpoint: ' + $probe)
        if (Test-Path -LiteralPath $logStderr) {
            Write-Host 'Recent server errors:' -ForegroundColor Yellow
            Get-Content -LiteralPath $logStderr -Tail 18 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
        }
        Write-Host 'Run Check-RushFinder.cmd. Node.js, required assets, and port 18827 must be available.'
        exit 1
    }
}
$health = Read-Engine
if ($null -ne $health) {
    if ($health.afterEffects -ne $true) {
        Write-Host 'WARNING: Adobe After Effects was not found. Reporter/name/role tag rendering will not work on this PC.' -ForegroundColor Yellow
    }
    if ($health.ffmpeg -ne $true) {
        Write-Host 'WARNING: FFmpeg was not found. Video/channel-tag functions need FFmpeg on this PC.' -ForegroundColor Yellow
    }
    if ($health.assetsReady -ne $true) {
        Write-Host 'WARNING: Some original After Effects artwork is missing.' -ForegroundColor Yellow
    }
    if ($health.roleMediaMissing -and @($health.roleMediaMissing).Count -gt 0) {
        Write-Host ('WARNING: Missing role-tag media: ' + (@($health.roleMediaMissing) -join ', ')) -ForegroundColor Yellow
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
