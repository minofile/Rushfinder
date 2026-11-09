# RushFinder 0961. Keep this PowerShell source ASCII-only for Windows PowerShell 5.1.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$path = Join-Path $root 'smart-edit.html'
$injectPath = Join-Path $root 'RF0961-INJECT.html'
if (-not (Test-Path -LiteralPath $path)) {
  Write-Host '[ERROR] Extract ZIP into the RushFinder Git folder next to smart-edit.html.' -ForegroundColor Red
  exit 1
}
if (-not (Test-Path -LiteralPath $injectPath)) {
  Write-Host '[ERROR] RF0961-INJECT.html was not found.' -ForegroundColor Red
  exit 1
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
if (-not $html.Contains('id="rfHermesLegacyContent"') -or -not $html.Contains('id="autoVoiceInput"') -or -not $html.Contains('id="script"') -or -not $html.Contains('class="project-controls"')) {
  Write-Host '[ERROR] The current editor is missing required controls; no changes made.' -ForegroundColor Red
  exit 1
}
if ($html.Contains('id="rf0961-editor-spacing-and-dedup"')) {
  Write-Host '[OK] 0961 UI correction already applied; no changes.' -ForegroundColor Green
  exit 0
}
if (-not $html.Contains('</head>')) {
  Write-Host '[ERROR] Cannot find closing head tag; no changes made.' -ForegroundColor Red
  exit 1
}
$inject = [System.IO.File]::ReadAllText($injectPath, [System.Text.Encoding]::UTF8)
$html = $html.Replace('</head>', $inject + "`r`n</head>")
[System.IO.File]::Copy($path, ($path + '.backup-before-0961'), $true)
[System.IO.File]::WriteAllText($path, $html, $utf8)
Write-Host '[OK] Duplicate narration controls hidden in Advanced Tools.' -ForegroundColor Green
Write-Host '[OK] Output format panel spacing corrected.' -ForegroundColor Green
Write-Host '[OK] Existing Hermes functions, buttons, and timeline kept.' -ForegroundColor Green
