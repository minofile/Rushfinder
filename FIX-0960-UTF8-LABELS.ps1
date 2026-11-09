# RushFinder 0960 - encoding-safe, ASCII-only PowerShell source.
# IMPORTANT: Leave this PS1 ASCII-only so Windows PowerShell 5.1 won't corrupt Persian text.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$path = Join-Path $root 'smart-edit.html'
if (-not (Test-Path -LiteralPath $path)) {
  Write-Host '[ERROR] Place this patch next to smart-edit.html in your RushFinder Git folder.' -ForegroundColor Red
  exit 1
}

# Construct the Persian labels from Unicode code points, independently of the PS1 encoding.
$title = -join @([char]0x062A,[char]0x062F,[char]0x0648,[char]0x06CC,[char]0x0646)
$send  = -join @([char]0x0627,[char]0x0631,[char]0x0633,[char]0x0627,[char]0x0644,[char]0x0020,[char]0x062F,[char]0x0631,[char]0x062E,[char]0x0648,[char]0x0627,[char]0x0633,[char]0x062A)
$utf8 = [System.Text.UTF8Encoding]::new($false)
$html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
if (-not $html.Contains('id="rfHermesPanel"') -or -not $html.Contains('id="rfHermesSubmit"')) {
  Write-Host '[ERROR] Hermes editor elements not found. File was not changed.' -ForegroundColor Red
  exit 1
}
$before = $html

# Find the header by its stable class or previous patch ID. Replace its full visible label,
# even when previous patch text is mojibake (e.g., Persian UTF-8 interpreted as ANSI).
$headerPattern = '(?s)(<div\b(?=[^>]*(?:class="[^"]*\brf-hermes-header\b[^"]*"|id="rf0959Heading"|id="rf0960Heading"))[^>]*>\s*<strong\b[^>]*>).*?(</strong>)'
$headerRE = [regex]::new($headerPattern)
if ($headerRE.IsMatch($html)) {
  $html = $headerRE.Replace($html, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $m.Groups[1].Value + $title + $m.Groups[2].Value }, 1)
} else {
  # 0957 hides the original status header; create a separate visible heading.
  $sectionRE = [regex]::new('(?s)<section\b(?=[^>]*\bid="rfHermesPanel")[^>]*>')
  $section = $sectionRE.Match($html)
  if (-not $section.Success) { Write-Host '[ERROR] Editor section missing.' -ForegroundColor Red; exit 1 }
  $heading = "`r`n  <div class=`"rf-hermes-header`" id=`"rf0960Heading`"><strong>" + $title + '</strong></div>'
  $html = $html.Insert($section.Index + $section.Length, $heading)
}

# Replace only the text inside the existing button; keep its id, attributes and handlers.
$buttonPattern = '(?s)(<button\b(?=[^>]*\bid="rfHermesSubmit")[^>]*>).*?(</button>)'
$buttonRE = [regex]::new($buttonPattern)
if (-not $buttonRE.IsMatch($html)) { Write-Host '[ERROR] Send button missing.' -ForegroundColor Red; exit 1 }
$html = $buttonRE.Replace($html, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $m.Groups[1].Value + $send + $m.Groups[2].Value }, 1)

# If 0957 put the button inside a hidden compatibility wrapper, move ONLY this button
# before the wrapper; leave status/import helper IDs and existing JS alone.
$hiddenRE = [regex]::new('(?s)(<div\b(?=[^>]*\bid="rf0957HermesJobCompat")[^>]*>\s*)(<button\b(?=[^>]*\bid="rfHermesSubmit")[^>]*>.*?</button>)')
$hm = $hiddenRE.Match($html)
if ($hm.Success) {
  $html = $html.Substring(0, $hm.Index) + '  ' + $hm.Groups[2].Value + "`r`n  " + $hm.Groups[1].Value + $html.Substring($hm.Index + $hm.Length)
}

# Keep the section's accessibility label consistent, without touching API identifiers.
$sectionRE = [regex]::new('(?s)<section\b(?=[^>]*\bid="rfHermesPanel")[^>]*>')
$section = $sectionRE.Match($html)
if ($section.Success) {
  $newTag = [regex]::Replace($section.Value, 'aria-label="[^"]*"', ('aria-label="' + $title + '"'))
  $html = $html.Substring(0, $section.Index) + $newTag + $html.Substring($section.Index + $section.Length)
}

# A prior 0958 stylesheet might be hiding these two specific controls.
# The override changes ONLY their visibility, not any other hidden helper controls.
if (-not $html.Contains('id="rf0960-visible-labels"')) {
  $css = @'
<style id="rf0960-visible-labels">
#rfHermesPanel .rf-hermes-header { display: flex !important; }
#rfHermesPanel #rfHermesSubmit { display: block !important; }
</style>
'@
  if (-not $html.Contains('</head>')) { Write-Host '[ERROR] Document head missing.' -ForegroundColor Red; exit 1 }
  $html = $html.Replace('</head>', $css + "`r`n</head>")
}

# Safe, local backup; never export existing secrets or unrelated project files.
if ($html -ne $before) {
  [System.IO.File]::Copy($path, ($path + '.backup-before-0960'), $true)
  [System.IO.File]::WriteAllText($path, $html, $utf8)
}
Write-Host '[OK] Visible title fixed (Persian: editing).' -ForegroundColor Green
Write-Host '[OK] Button label fixed (Persian: send request).' -ForegroundColor Green
Write-Host '[OK] Original button ID and Hermes integration preserved.' -ForegroundColor Green
