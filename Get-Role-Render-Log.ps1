$ErrorActionPreference = 'Stop'
$jobRoot = Join-Path $HOME 'RushFinder-Cache\ae-jobs'
if (-not (Test-Path -LiteralPath $jobRoot)) { Write-Host 'No RushFinder render job folder found.'; exit 1 }
$folder = Get-ChildItem -LiteralPath $jobRoot -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'run-role.jsx') } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $folder) { Write-Host 'No name and role render job found.'; exit 1 }
$outDir = Join-Path $HOME 'RushFinder-Exports'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$out = Join-Path $outDir 'Last-Role-Render-Diagnostics.txt'
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('RushFinder name-and-role diagnostics')
$lines.Add(('Job folder: ' + $folder.FullName))
$lines.Add(('Collected: ' + (Get-Date -Format s)))
foreach ($name in @('render.error','render.done','ae-render.log','worker-launch.log')) {
 $file = Join-Path $folder.FullName $name
 $lines.Add('')
 $lines.Add(('====== ' + $name + ' ======'))
 if (Test-Path -LiteralPath $file) {
  try { $lines.Add([string](Get-Content -LiteralPath $file -Raw -ErrorAction Stop)) }
  catch { $lines.Add(('Read error: '+ $_.Exception.Message)) }
 } else { $lines.Add('(not created)') }
}
[System.IO.File]::WriteAllLines($out, $lines.ToArray(), (New-Object System.Text.UTF8Encoding $true))
Write-Host ('Saved: ' + $out)
Start-Process -FilePath 'notepad.exe' -ArgumentList ('"' + $out + '"')
