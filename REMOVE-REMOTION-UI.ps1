# RushFinder 0952 - remove only the broken Remotion Studio UI from smart-edit.html.
# Supports both 0950 (in-preview) and 0951 (overlay) integrations.
$ErrorActionPreference = 'Stop'
try {
    $base = Split-Path -Parent $MyInvocation.MyCommand.Path
    $target = Join-Path $base 'smart-edit.html'
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
        throw 'smart-edit.html not found. Extract this patch into the ROOT of your existing RushFinder Git repository.'
    }

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $html = [System.IO.File]::ReadAllText($target, [System.Text.Encoding]::UTF8)

    $rules = @(
        @{ Name = 'button'; Pattern = '(?is)<button\b(?=[^>]*\bid\s*=\s*["'']rfRemotionToggle["''])[^>]*>.*?</button>' },
        @{ Name = 'iframe'; Pattern = '(?is)<iframe\b(?=[^>]*\bid\s*=\s*["'']rfRemotionFrame["''])[^>]*>\s*</iframe>' },
        @{ Name = 'CSS'; Pattern = '(?is)\s*<style\s+id\s*=\s*["'']rf095[01]-remotion-(?:player|studio)["'']\s*>.*?</style>' },
        @{ Name = 'bridge'; Pattern = '(?is)\s*<script\b(?=[^>]*\bsrc\s*=\s*["'']remotion-bridge\.js(?:\?[^"'']*)?["''])[^>]*>\s*</script>' }
    )

    $counts = @{}
    $edited = $html
    foreach ($rule in $rules) {
        $matchesFound = [regex]::Matches($edited, $rule.Pattern)
        $counts[$rule.Name] = $matchesFound.Count
        if ($matchesFound.Count -gt 1) { throw ('Unexpected duplicate Remotion ' + $rule.Name + ' nodes. No changes made.') }
        $edited = [regex]::Replace($edited, $rule.Pattern, '')
    }

    if ($counts['button'] -eq 0) {
        if ($html -notmatch 'rfRemotionToggle') {
            Write-Host '[OK] Remotion Studio button is already absent. No changes required.' -ForegroundColor Green
            exit 0
        }
        throw 'Could not safely identify the Remotion button. No changes made.'
    }

    if ($edited -match 'id\s*=\s*["'']rfRemotionToggle["'']' -or $edited -match 'id\s*=\s*["'']rfRemotionFrame["'']' -or $edited -match 'src\s*=\s*["'']remotion-bridge\.js') {
        throw 'Remotion UI check did not pass. No changes made.'
    }
    if ($edited -notmatch 'id="canvas"' -or $edited -notmatch 'id="aspect"' -or $edited -notmatch 'id="play"') {
        throw 'Core editor controls check failed. No changes made.'
    }

    [System.IO.File]::Copy($target, ($target + '.before-remove-remotion.bak'), $true)
    [System.IO.File]::WriteAllText($target, $edited, $utf8)
    Write-Host '[OK] Removed Remotion Studio button, unused iframe, bridge script and dedicated CSS.' -ForegroundColor Green
    Write-Host '[OK] Main RushFinder canvas, aspect selector, timeline and AI editing remain unchanged.' -ForegroundColor Green
    Write-Host '[BACKUP] smart-edit.html.before-remove-remotion.bak'
}
catch {
    Write-Host ('[ERROR] ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
