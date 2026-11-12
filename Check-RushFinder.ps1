$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host '===== RushFinder news-tag diagnostics =====' -ForegroundColor Cyan
Write-Host ('Folder: ' + $root)
Write-Host ('Windows: ' + [Environment]::OSVersion.VersionString)
function Has-File($name) {
    $present = Test-Path -LiteralPath (Join-Path $root $name) -PathType Leaf
    Write-Host (('{0,-55} : {1}' -f $name, $(if($present){'OK'}else{'MISSING'})))
}
Has-File 'index.html'
Has-File 'ae-auto-server.js'
Has-File 'Start-RushFinder.ps1'
Has-File 'ae-original\خبر فوری 2(2).aep'
Has-File 'ae-original\اخبار مشهد.aep'
Has-File 'ae-original\تگ گزارش.aep'
Has-File 'assets\news-tag\fori-channel-tag.png'
Has-File 'assets\news-tag\mashhad-channel-tag.png'
$portableNode = Join-Path $root 'tools\node\node.exe'
$node = if (Test-Path $portableNode) { $portableNode } else { (Get-Command node.exe -ErrorAction SilentlyContinue).Source }
if ($node) {
    Write-Host ('Node.js: ' + $node) -ForegroundColor Green
    try { & $node --version } catch { Write-Host ('Node failed: ' + $_.Exception.Message) -ForegroundColor Red }
} else {
    Write-Host 'Node.js: NOT FOUND. Install Windows Node.js LTS from nodejs.org.' -ForegroundColor Red
}
$ae = $null
foreach ($parent in @($env:ProgramFiles,${env:ProgramFiles(x86)})) {
    if (-not $parent) { continue }
    $adobeDir = Join-Path $parent 'Adobe'
    if (-not (Test-Path $adobeDir)) { continue }
    $dirs = @(Get-ChildItem -LiteralPath $adobeDir -Directory -ErrorAction SilentlyContinue | Where-Object {$_.Name -like 'Adobe After Effects*'} | Sort-Object Name -Descending)
    foreach($d in $dirs) { $p = Join-Path $d.FullName 'Support Files\AfterFX.exe'; if(Test-Path $p) {$ae=$p;break} }
    if ($ae) { break }
}
if ($ae) { Write-Host ('After Effects: ' + $ae) -ForegroundColor Green }
else { Write-Host 'After Effects: NOT FOUND (required for reporter/name/role templates).' -ForegroundColor Yellow }
$ffmpegCandidates=@((Join-Path $root 'tools\ffmpeg.exe'),(Join-Path $env:LOCALAPPDATA 'RushFinder\tools\ffmpeg.exe'),(Join-Path $root 'ffmpeg.exe'))
$ffmpegCommand = Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
if ($ffmpegCommand) { $ffmpegCandidates+= $ffmpegCommand.Source }
$ffmpeg = $null
foreach ($p in $ffmpegCandidates) { if ($p -and (Test-Path $p -PathType Leaf)) { try { & $p -version | Out-Null; if ($LASTEXITCODE -eq 0) {$ffmpeg=$p;break} } catch {} } }
if($ffmpeg) { Write-Host ('FFmpeg: ' + $ffmpeg) -ForegroundColor Green }
else { Write-Host 'FFmpeg: NOT FOUND (needed for video/channel tag output). See setup-ffmpeg.ps1.' -ForegroundColor Yellow }
$busy = $false
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $ar=$client.BeginConnect('127.0.0.1',18827,$null,$null)
    if($ar.AsyncWaitHandle.WaitOne(500)) { $client.EndConnect($ar);$busy=$true }
    $client.Close()
} catch { }
if($busy) {
    Write-Host 'Port 18827: IN USE' -ForegroundColor Yellow
    try {
        $report=Invoke-RestMethod -Uri 'http://127.0.0.1:18827/ae-api/check' -TimeoutSec 3
        Write-Host ('Running engine from: ' + $report.installRoot)
        Write-Host ('Engine version: ' + $report.version)
        Write-Host ('Channel tag ready: ' + $report.channelTag)
        Write-Host ('Reporter AE ready: ' + $report.afterEffects)
        Write-Host ('FFmpeg ready: ' + $report.ffmpeg)
        Write-Host ('Role missing media: ' + (@($report.roleMediaMissing) -join ', '))
    } catch { Write-Host 'Port 18827 is used but RushFinder engine does not respond.' -ForegroundColor Red }
} else { Write-Host 'Port 18827: FREE (engine not running)' }
Write-Host 'Browser: open http://127.0.0.1:18827/index.html only after Start-RushFinder.cmd succeeds.'
Write-Host 'IMPORTANT: A localhost engine on one PC is NOT accessible to other users on the internet.' -ForegroundColor Cyan
Write-Host '===== End diagnostics =====' -ForegroundColor Cyan
