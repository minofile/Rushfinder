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
if (-not (Test-Path -LiteralPath $oldJobs)) { Write-Host 'No old render temp folder.'; exit 0 }
$eligible = @(Get-ChildItem -LiteralPath $oldJobs -Directory | Where-Object {
    $_.Name -match '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' -and
    (Test-Path -LiteralPath (Join-Path $exports ($_.Name + '.mp4')))
})
if ($eligible.Count -eq 0) { Write-Host 'No matching completed temporary job folders to clean.'; exit 0 }
Write-Host 'Temporary job folders eligible for removal:'
$eligible | ForEach-Object { Write-Host ('  ' + $_.FullName) }
Write-Host 'Only job folders with corresponding MP4 files in RushFinder-Exports are eligible.'
Write-Host 'NOTE: These folders may include input video copies, AE frames, MOV files, and logs.'
$confirm = Read-Host 'To delete these temporary folders, type DELETE'
if ($confirm -cne 'DELETE') { Write-Host 'Cancelled. Nothing deleted.'; exit 0 }
$deleted=0
foreach ($dir in $eligible) {
    $output = Join-Path $exports ($dir.Name + '.mp4')
    if ((Test-Path -LiteralPath $output) -and (Get-Item -LiteralPath $output).Length -gt 1024) {
        try { Remove-Item -LiteralPath $dir.FullName -Recurse -Force -ErrorAction Stop; $deleted++ }
        catch { Write-Warning ('Could not delete temp directory ' + $dir.Name + ': ' + $_.Exception.Message) }
    }
}
Write-Host ('Deleted ' + $deleted + ' completed temporary job folders. Final MP4s were kept.')
