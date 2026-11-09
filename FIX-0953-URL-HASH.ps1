$ErrorActionPreference = 'Stop'
$target = Join-Path $PSScriptRoot 'index.html'
if (-not (Test-Path -LiteralPath $target)) {
  Write-Host '[ERROR] index.html not found. Copy these files to the RushFinder Git repository root.' -ForegroundColor Red
  exit 1
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$src = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
$fromClick = "try{history.replaceState(null,'','#smart-edit')}catch(e){}"
$fromStartup = "window.addEventListener('resize',bounds);bounds();if(location.hash==='#smart-edit')btn.click();"
$toStartup = "window.addEventListener('resize',bounds);bounds();if(location.hash==='#smart-edit'){btn.click();try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}"

$needsClick = $src.Contains($fromClick)
$needsStartup = $src.Contains($fromStartup)
$already = $src.Contains($toStartup)
if (-not $needsClick -and -not $needsStartup -and -not $already) {
  Write-Host '[ERROR] Expected RushFinder routing code not found. No file changed.' -ForegroundColor Red
  exit 2
}
if ($needsClick -and -not $needsStartup -and -not $already) {
  Write-Host '[ERROR] Routing code is partially different. No file changed.' -ForegroundColor Red
  exit 3
}
if ($needsStartup -and -not $needsClick -and -not $already) {
  Write-Host '[ERROR] Routing code is partially different. No file changed.' -ForegroundColor Red
  exit 3
}
if (-not $needsClick -and -not $needsStartup) {
  Write-Host '[OK] Hash navigation fix is already applied.' -ForegroundColor Green
  exit 0
}
$backupDir = Join-Path $PSScriptRoot '.rf-backups'
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$backup = Join-Path $backupDir ('index-before-0953-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.html')
Copy-Item -LiteralPath $target -Destination $backup
$updated = $src.Replace($fromClick, '/* 0953: keep the current page URL free of a persistent smart-edit hash */').Replace($fromStartup, $toStartup)
if ($updated.Contains($fromClick) -or $updated.Contains($fromStartup) -or -not $updated.Contains($toStartup)) {
  Write-Host '[ERROR] Replacement check failed, original preserved.' -ForegroundColor Red
  exit 4
}
[System.IO.File]::WriteAllText($target, $updated, $utf8)
Write-Host '[OK] Updated index.html. Smart Edit no longer adds #smart-edit to the address.' -ForegroundColor Green
Write-Host '[OK] Existing #smart-edit URLs will open the editor once and then clean the address.' -ForegroundColor Green
Write-Host ('[BACKUP] ' + $backup)
