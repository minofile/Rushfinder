$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$file = Join-Path $root 'smart-edit.html'
if (-not (Test-Path -LiteralPath $file)) {
  Write-Host '[ERROR] smart-edit.html not found. Copy BOTH files into the main RushFinder Git folder.' -ForegroundColor Red
  exit 1
}
$html = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
if ($html -notmatch 'id="rfHermesPanel"') {
  Write-Host '[ERROR] This does not look like the RushFinder Hermes editor. No changes made.' -ForegroundColor Red
  exit 1
}
$marker = 'id="rf0958-hide-circled-hermes"'
if ($html.Contains($marker)) {
  Write-Host '[OK] The two circled elements are already hidden.' -ForegroundColor Green
  exit 0
}
if (-not $html.Contains('</head>')) {
  Write-Host '[ERROR] Missing closing head tag. No changes made.' -ForegroundColor Red
  exit 1
}
$css = @'
<!-- RushFinder 0958: retain JS IDs but remove unfinished Hermes controls from the visible editor. -->
<style id="rf0958-hide-circled-hermes">
#rfHermesPanel .rf-hermes-header,
#rfHermesPanel #rfHermesSubmit,
#rfHermesPanel #rfHermesStatus,
#rfHermesPanel .rf-hermes-actions,
#rfHermesPanel #rfHermesPreviewLink,
#rfHermesPanel .rf-hermes-note,
#rfHermesPanel .rf-hermes-access { display: none !important; }
</style>
'@
$html = $html.Replace('</head>', ($css + "`r`n</head>"))
[System.IO.File]::WriteAllText($file, $html, ([System.Text.UTF8Encoding]::new($false)))
Write-Host '[OK] Hidden: Hermes heading, send button, status/help boxes. Text/audio inputs are unchanged.' -ForegroundColor Green
