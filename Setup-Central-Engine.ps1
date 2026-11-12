$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$secret=Join-Path $root '.rf-central-secret'
if (-not (Test-Path $secret)) {
  $b=New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  $key=[Convert]::ToBase64String($b)
  [System.IO.File]::WriteAllText($secret,$key,[System.Text.UTF8Encoding]::new($false))
  Write-Host 'New signing key generated locally.' -ForegroundColor Green
}
Write-Host 'Paste this signing key ONLY into Vercel env RF_TAG_SIGNING_KEY (never into GitHub/chat):' -ForegroundColor Yellow
Get-Content -LiteralPath $secret
Write-Host 'Add RF_TAG_ACCESS_CODE (12+ chars) and RF_TAG_GATEWAY_URL to Vercel too.' -ForegroundColor Cyan
Write-Host 'Launch Start-RushFinder.cmd, then Start-Central-Gateway.cmd, then Cloudflare Tunnel.'
