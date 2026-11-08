param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root
if (-not (Test-Path -LiteralPath (Join-Path $root 'index.html'))) { throw 'Run only in RushFinder root.' }
if (-not (Test-Path -LiteralPath (Join-Path $root 'api/youtube-music.js'))) { throw 'RushFinder api files not found.' }
$manifest = Get-Content -LiteralPath (Join-Path $root 'LITE-CLEANUP-MANIFEST.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$parent = Split-Path -Parent $root
$backup = Join-Path $parent ('RushFinder-LITE-OldFiles-Backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$removed = 0; $skipped = 0; $found = 0
foreach ($entry in $manifest.files) {
  $rel = [string]$entry.path
  if ($rel -match '^/' -or $rel -match '\.\.' -or $rel -match '[\\:]') { throw ('Unsafe manifest path: ' + $rel) }
  $file = Join-Path $root ($rel -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
  $found++
  $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne [string]$entry.sha256) { $skipped++; Write-Host ('SKIP changed file: ' + $rel); continue }
  if ($Apply) {
    $dest = Join-Path $backup ($rel -replace '/', [IO.Path]::DirectorySeparatorChar)
    New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
    Move-Item -LiteralPath $file -Destination $dest
    $removed++
  }
}
if ($Apply) {
  Write-Host ('Moved ' + $removed + ' obsolete files to backup: ' + $backup)
  Write-Host ('Skipped modified files: ' + $skipped)
} else {
  Write-Host ('Preview: ' + $found + ' files match manifest. ' + $skipped + ' modified files will be skipped.')
  Write-Host 'To apply: powershell -ExecutionPolicy Bypass -File .\CLEANUP-LITE.ps1 -Apply'
}
Write-Host 'Local secret file and fonts remain untouched.'
