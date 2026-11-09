$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$path = Join-Path $root 'smart-edit.html'
if (-not (Test-Path -LiteralPath $path)) { Write-Host '[ERROR] Copy this script next to smart-edit.html.' -ForegroundColor Red; exit 1 }
$html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
if (-not $html.Contains('id="rfHermesPanel"')) { Write-Host '[ERROR] Hermes editor not found. No changes made.' -ForegroundColor Red; exit 1 }
$before = $html
# Only rename UI strings. Do not rename IDs, APIs, JS functions, or Hermes provider.
$html = $html.Replace('تدوین با Hermes', 'تدوین').Replace('ارسال درخواست به Hermes', 'ارسال درخواست')
# In RushFinder 0957, the previous update hid both controls in compatibility wrappers.
# Restore a visible heading while preserving all hidden JS dependency nodes.
if ($html.Contains('id="rf0957HermesHiddenHeader"') -and -not $html.Contains('id="rf0959Heading"')) {
  $section = [regex]::Match($html, '<section\b[^>]*id="rfHermesPanel"[^>]*>')
  if (-not $section.Success) { Write-Host '[ERROR] Cannot locate Hermes section.' -ForegroundColor Red; exit 1 }
  $heading = "`r`n  <div class=`"rf-hermes-header`" id=`"rf0959Heading`"><strong>تدوین</strong></div>"
  $html = $html.Insert($section.Index + $section.Length, $heading)
}
if ($html.Contains('id="rf0957HermesJobCompat"')) {
  $pattern = '(?s)(<div id="rf0957HermesJobCompat"[^>]*>\s*)(<button\b[^>]*id="rfHermesSubmit"[^>]*>.*?</button>)'
  $m = [regex]::Match($html, $pattern)
  if ($m.Success) {
    $visibleButton = $m.Groups[2].Value
    # Keep the exact same button element and ID so the existing click handler still works.
    $replacement = $visibleButton + "`r`n  " + $m.Groups[1].Value
    $html = $html.Substring(0, $m.Index) + $replacement + $html.Substring($m.Index + $m.Length)
  }
}
# Version 0958 may have injected a stylesheet hiding the heading and button.
$css = [regex]::Match($html, '(?s)<style id="rf0958-hide-circled-hermes">.*?</style>')
if ($css.Success) {
  $newCss = $css.Value
  $newCss = [regex]::Replace($newCss, '(?m)^\s*#rfHermesPanel \.rf-hermes-header,\s*\r?\n', '')
  $newCss = [regex]::Replace($newCss, '(?m)^\s*#rfHermesPanel #rfHermesSubmit,\s*\r?\n', '')
  $html = $html.Substring(0, $css.Index) + $newCss + $html.Substring($css.Index + $css.Length)
}
if ($html -eq $before) {
  Write-Host '[OK] No text changes needed; labels are already correct.' -ForegroundColor Green
  exit 0
}
[System.IO.File]::WriteAllText($path, $html, ([System.Text.UTF8Encoding]::new($false)))
Write-Host '[OK] Heading: تدوین | Button: ارسال درخواست' -ForegroundColor Green
Write-Host '[OK] Existing Hermes click handler, inputs, and timeline are untouched.' -ForegroundColor Green
