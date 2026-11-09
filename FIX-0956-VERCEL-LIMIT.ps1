$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$chatPath = Join-Path $root 'api\chat.js'
$uiPath = Join-Path $root 'hermes-ui.js'
$htmlPath = Join-Path $root 'smart-edit.html'
$indexPath = Join-Path $root 'index.html'
$handlerPath = Join-Path $root 'lib\hermes-handler.cjs'
foreach ($p in @($chatPath, $uiPath, $htmlPath, $handlerPath)) {
  if (-not (Test-Path -LiteralPath $p -PathType Leaf)) { throw "Missing required file: $p. Extract this ZIP into the EXISTING RushFinder repository." }
}
$enc = New-Object System.Text.UTF8Encoding($false)
function ReadUtf8($p) { return [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteUtf8IfChanged($p,$new) {
  $old = ReadUtf8 $p
  if ($old -ne $new) {
    [System.IO.File]::Copy($p, ($p + '.before-0956.bak'), $true)
    [System.IO.File]::WriteAllText($p, $new, $enc)
    Write-Host "[OK] Updated $(Split-Path $p -Leaf)" -ForegroundColor Green
  } else { Write-Host "[OK] Unchanged $(Split-Path $p -Leaf)" }
}
# Preserve all pre-existing Groq, Claude, Gemini and API routes in api/chat.js.
$chat = ReadUtf8 $chatPath
$signature = [regex]::Match($chat, 'export\s+default\s+async\s+function\s+handler\s*\(\s*req\s*,\s*res\s*\)\s*\{')
if (-not $signature.Success) { throw 'Unsupported api/chat.js signature. No files changed; contact developer.' }
$imp = "import rfHermesRelay from '../lib/hermes-handler.cjs';"
if (-not $chat.Contains($imp)) { $chat = $imp + "`n" + $chat }
if (-not $chat.Contains('return rfHermesRelay(req,res);')) {
  $signature = [regex]::Match($chat, 'export\s+default\s+async\s+function\s+handler\s*\(\s*req\s*,\s*res\s*\)\s*\{')
  $route = "`n  if (String(req.query?.mode || '') === 'hermes') return rfHermesRelay(req,res); // RF-0956`n"
  $chat = $chat.Insert($signature.Index + $signature.Length, $route)
}
# Ensure previous edit did not create duplicate route wiring.
if ([regex]::Matches($chat,[regex]::Escape('return rfHermesRelay(req,res);')).Count -ne 1) { throw 'Duplicate Hermes route. No files changed.' }
$ui = ReadUtf8 $uiPath
$oldEndpoint = '/api/hermes'
$newEndpoint = '/api/chat?mode=hermes'
if (-not ($ui.Contains($oldEndpoint) -or $ui.Contains($newEndpoint))) { throw 'Hermes UI API path not found. No files changed.' }
$ui = $ui.Replace($oldEndpoint,$newEndpoint)
$html = ReadUtf8 $htmlPath
if ($html -notmatch 'hermes-ui\.js') { throw 'Hermes script not found in smart-edit.html. No files changed.' }
$html = [regex]::Replace($html,'hermes-ui\.js\?v=\d+','hermes-ui.js?v=0956')
$index = $null
if (Test-Path -LiteralPath $indexPath -PathType Leaf) {
  $index = ReadUtf8 $indexPath
  $index = [regex]::Replace($index,'smart-edit\.html\?embedded=1&v=\d+','smart-edit.html?embedded=1&v=0956')
}
# All checks passed. Apply changes now.
WriteUtf8IfChanged $chatPath $chat
WriteUtf8IfChanged $uiPath $ui
WriteUtf8IfChanged $htmlPath $html
if ($null -ne $index) { WriteUtf8IfChanged $indexPath $index }
$oldFunction = Join-Path $root 'api\hermes.js'
if (Test-Path -LiteralPath $oldFunction -PathType Leaf) {
  Remove-Item -LiteralPath $oldFunction -Force
  Write-Host '[OK] Removed standalone api/hermes.js (13th Vercel function)' -ForegroundColor Green
}
Write-Host '[OK] Hermes now shares the existing api/chat.js function.' -ForegroundColor Green
