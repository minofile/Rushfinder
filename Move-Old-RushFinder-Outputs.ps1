$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
# Locate the old RushFinder renders, even if this helper is run from a NEW unpacked ZIP.
function Find-OldJobs {
    $candidates = @(
        (Join-Path $root 'ae-jobs'),
        (Join-Path $env:USERPROFILE 'Documents\GitHub\RushFinder\ae-jobs'),
        (Join-Path $env:USERPROFILE 'OneDrive\Documents\GitHub\RushFinder\ae-jobs')
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Container) { return $candidate }
    }
    Write-Host 'Please enter the path to your OLD RushFinder folder (the one with ae-jobs).'
    $entered = Read-Host 'OLD RushFinder folder, or blank to cancel'
    if ([string]::IsNullOrWhiteSpace($entered)) { return $null }
    $entered = $entered.Trim().Trim('"')
    $jobs = if ((Split-Path -Leaf $entered) -ieq 'ae-jobs') { $entered } else { Join-Path $entered 'ae-jobs' }
    if (Test-Path -LiteralPath $jobs -PathType Container) { return $jobs }
    return $null
}
$oldJobs = Find-OldJobs
$exports = Join-Path $env:USERPROFILE 'RushFinder-Exports'
if (-not (Test-Path -LiteralPath $oldJobs)) {
    Write-Host 'No old ae-jobs directory found. Nothing to move.'
    exit 0
}
New-Item -ItemType Directory -Force -Path $exports | Out-Null
$moved = 0; $skipped = 0
Get-ChildItem -LiteralPath $oldJobs -File -Filter '*.mp4' | ForEach-Object {
    # Move only UUID-named render outputs, not arbitrary source videos.
    if ($_.BaseName -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { $skipped++; return }
    $target = Join-Path $exports $_.Name
    if (Test-Path -LiteralPath $target) {
        Write-Host ('SKIPPED (already exists): ' + $_.Name)
        $skipped++; return
    }
    Write-Host ('Moving completed MP4: ' + $_.Name)
    try { Move-Item -LiteralPath $_.FullName -Destination $target -ErrorAction Stop; $moved++ }
    catch { Write-Warning ('Cannot move ' + $_.Name + ': ' + $_.Exception.Message); $skipped++ }
}
Write-Host ('Moved ' + $moved + ' MP4 file(s). Skipped ' + $skipped + '.')
Write-Host ('Saved outputs at: ' + $exports)
Write-Host 'Temp render job folders have NOT been deleted.'
