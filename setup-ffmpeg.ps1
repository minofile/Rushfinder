﻿$ErrorActionPreference='Stop'
$target=Join-Path $PSScriptRoot 'tools\ffmpeg.exe'
$cache=Join-Path $env:LOCALAPPDATA 'RushFinder\tools\ffmpeg.exe'
$tools=Split-Path $target -Parent
New-Item -ItemType Directory -Force -Path $tools | Out-Null
function ValidExe($p) {
 if(-not $p -or -not (Test-Path -LiteralPath $p -PathType Leaf)){return $false}
 try { & $p -version *> $null; return ($LASTEXITCODE -eq 0) }catch{return $false}
}
function SaveExe($p){
 if(-not (ValidExe $p)){return $false}
 if($p -ne $target){Copy-Item -LiteralPath $p -Destination $target -Force}
 try {New-Item -ItemType Directory -Force -Path (Split-Path $cache -Parent) | Out-Null; Copy-Item -LiteralPath $target -Destination $cache -Force}catch{}
 Write-Host ('FFmpeg ready: '+$target) -ForegroundColor Green
 return $true
}
if(SaveExe $target){exit 0}
if(SaveExe $cache){exit 0}
$cmd=Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
if($cmd -and (SaveExe $cmd.Source)){exit 0}
# Find already extracted older RushFinder versions next to this version (usually Downloads).
$parent=Split-Path $PSScriptRoot -Parent
$dirs=Get-ChildItem -LiteralPath $parent -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '(?i)rushfinder|^rf0' }
foreach($d in $dirs){
 $candidates=@(
  (Join-Path $d.FullName 'tools\ffmpeg.exe'),
  (Join-Path $d.FullName 'ffmpeg.exe'),
  (Join-Path $d.FullName 'bin\ffmpeg.exe')
 )
 foreach($c in $candidates){if(SaveExe $c){exit 0}}
}
# If no previous FFmpeg was found, attempt once, with an actual timeout.
# A network failure does not block the site from opening.
$marker=Join-Path $tools 'ffmpeg-download-attempted.txt'
if(Test-Path $marker){Write-Host 'Previous automatic download failed. Opening RushFinder with a clear FFmpeg status.';exit 2}
Set-Content -LiteralPath $marker -Value 'Automatic download attempted.' -Encoding ASCII
$archive=Join-Path $env:TEMP 'rushfinder-0770-ffmpeg.zip'
$extract=Join-Path $env:TEMP 'rushfinder-0770-ffmpeg-unpack'
try{
 Write-Host 'FFmpeg not found in older versions. Trying one automatic download (max 90 seconds)...'
 Add-Type -AssemblyName System.Net.Http
 $client=New-Object System.Net.Http.HttpClient
 $client.Timeout=[TimeSpan]::FromSeconds(90)
 $uri='https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
 $response=$client.GetAsync($uri).GetAwaiter().GetResult()
 $response.EnsureSuccessStatusCode() | Out-Null
 $bytes=$response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
 [System.IO.File]::WriteAllBytes($archive,$bytes)
 if(Test-Path $extract){Remove-Item -LiteralPath $extract -Recurse -Force}
 Expand-Archive -LiteralPath $archive -DestinationPath $extract -Force
 $exe=Get-ChildItem -LiteralPath $extract -Filter ffmpeg.exe -File -Recurse | Select-Object -First 1
 if(-not $exe){throw 'ffmpeg.exe not found in downloaded archive'}
 if(SaveExe $exe.FullName){Remove-Item -LiteralPath $marker -ErrorAction SilentlyContinue;exit 0}
 throw 'FFmpeg file failed its validation'
}catch{Write-Host ('FFmpeg could not be downloaded automatically: '+$_.Exception.Message) -ForegroundColor Yellow;exit 2}
finally{if($client){$client.Dispose()};Remove-Item $archive -ErrorAction SilentlyContinue;Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue}
