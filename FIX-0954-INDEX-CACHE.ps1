$ErrorActionPreference = 'Stop'
$target = Join-Path $PSScriptRoot 'index.html'
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { Write-Host '[ERROR] index.html missing from current RushFinder Git folder.' -ForegroundColor Red; exit 1 }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$src = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)
$pattern = 'smart-edit\.html\?embedded=1&v=\d+'
$hits = [regex]::Matches($src, $pattern)
if ($hits.Count -eq 0) { Write-Host '[INFO] Editor cache version not found. index.html left as is.'; exit 0 }
if ($hits.Count -ne 1) { Write-Host '[ERROR] Unexpected editor references. No change.' -ForegroundColor Red; exit 2 }
$new = [regex]::Replace($src, $pattern, 'smart-edit.html?embedded=1&v=0954')
if ($new -ne $src) {
  [System.IO.File]::Copy($target, $target + '.before-0954.bak', $true)
  [System.IO.File]::WriteAllText($target, $new, $utf8)
  Write-Host '[OK] Updated only the embedded editor cache version.' -ForegroundColor Green
} else { Write-Host '[OK] The editor version is already 0954.' -ForegroundColor Green }
