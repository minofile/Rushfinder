# Local-only PowerShell static server. Windows PowerShell 5.1 built-in; no installation.
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$port=8765
$listener=New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Write-Host "RushFinder local: http://127.0.0.1:$port/index.html"
$types=@{'.html'='text/html; charset=utf-8';'.js'='text/javascript; charset=utf-8';'.css'='text/css; charset=utf-8';'.wasm'='application/wasm';'.json'='application/json';'.png'='image/png';'.jpg'='image/jpeg';'.jpeg'='image/jpeg';'.webp'='image/webp';'.svg'='image/svg+xml';'.ico'='image/x-icon';'.woff2'='font/woff2';'.ttf'='font/ttf';'.mp4'='video/mp4';'.webm'='video/webm';'.mov'='video/quicktime';'.mp3'='audio/mpeg';'.wav'='audio/wav'}
try {
 while($listener.IsListening){
  $ctx=$listener.GetContext()
  try{
   $rel=[Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
   if(!$rel){$rel='index.html'}
   $full=[IO.Path]::GetFullPath((Join-Path $root ($rel -replace '/','\')))
   if(!$full.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){ $ctx.Response.StatusCode=403;continue }
   if(!(Test-Path -LiteralPath $full -PathType Leaf)){ $ctx.Response.StatusCode=404;continue }
   $ext=[IO.Path]::GetExtension($full).ToLowerInvariant();$ctx.Response.ContentType=if($types.ContainsKey($ext)){$types[$ext]}else{'application/octet-stream'}
   $ctx.Response.AddHeader('Cache-Control','no-store')
   $stream=[IO.File]::OpenRead($full)
   try{
    $size=$stream.Length;$start=0L;$end=$size-1
    $ctx.Response.AddHeader('Accept-Ranges','bytes')
    if($ctx.Request.Headers['Range'] -match '^bytes=(\d+)-(\d*)$'){
      $start=[long]$Matches[1];if($Matches[2]){$end=[Math]::Min([long]$Matches[2],$size-1)}
      if($start -ge $size -or $start -gt $end){$ctx.Response.StatusCode=416;continue}
      $ctx.Response.StatusCode=206;$ctx.Response.AddHeader('Content-Range',"bytes $start-$end/$size")
    }
    $ctx.Response.ContentLength64=$end-$start+1
    $stream.Seek($start,[IO.SeekOrigin]::Begin)|Out-Null
    $buf=New-Object byte[] 65536;$left=$end-$start+1
    while($left -gt 0){$read=$stream.Read($buf,0,[int][Math]::Min($buf.Length,$left));if($read -le 0){break};$ctx.Response.OutputStream.Write($buf,0,$read);$left-=$read}
   }finally{$stream.Dispose()}
  }catch{Write-Host $_.Exception.Message}finally{try{$ctx.Response.Close()}catch{}}
 }
}finally{$listener.Stop();$listener.Close()}
