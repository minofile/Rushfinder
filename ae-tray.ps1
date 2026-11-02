# RushFinder 0781 - Windows native system tray companion (Windows PowerShell 5.1)
# No third party tray utility. Never terminates Adobe without an explicit user confirmation.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class RushWindow {
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
}
'@
$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = [System.Drawing.SystemIcons]::Application
$tray.Text = 'RushFinder - After Effects Engine'
$tray.Visible = $true
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$showItem = $menu.Items.Add('Show After Effects')
$hideItem = $menu.Items.Add('Hide After Effects (tray)')
$null = $menu.Items.Add('-')
$stopItem = $menu.Items.Add('Close After Effects (confirm)')
$exitItem = $menu.Items.Add('Exit tray controller (leave AE running)')
$tray.ContextMenuStrip = $menu
$script:trackedId = 0
$script:wantHidden = $true
$script:running = $true
$script:starting = $false
function Get-RushAE {
 try {
   if($script:trackedId -gt 0){
     $p = Get-Process -Id $script:trackedId -ErrorAction SilentlyContinue
     if($p -and !$p.HasExited){ return $p }
   }
   # If AE already exists, reuse it; never launch an unnecessary second instance.
   $p = Get-Process AfterFX -ErrorAction SilentlyContinue | Select-Object -First 1
   if($p){ $script:trackedId=$p.Id; return $p }
 } catch {}
 return $null
}
function Apply-WindowState {
 $p=Get-RushAE
 if(!$p){return}
 try {
   $p.Refresh();$h=$p.MainWindowHandle
   if($h -ne [IntPtr]::Zero){
     if($script:wantHidden){ [void][RushWindow]::ShowWindow($h,0) }
   }
 } catch {}
}
$showItem.add_Click({
 $script:wantHidden=$false
 $p=Get-RushAE
 if($p){ try {$p.Refresh(); if($p.MainWindowHandle -ne [IntPtr]::Zero){[void][RushWindow]::ShowWindow($p.MainWindowHandle,9)}}catch{} }
})
$hideItem.add_Click({$script:wantHidden=$true;Apply-WindowState})
$tray.add_DoubleClick({$script:wantHidden=$false;$p=Get-RushAE; if($p){try{$p.Refresh();[void][RushWindow]::ShowWindow($p.MainWindowHandle,9)}catch{}}})
$stopItem.add_Click({
 $choice=[System.Windows.Forms.MessageBox]::Show('Close the After Effects engine? Save any other open projects before continuing.','RushFinder', [System.Windows.Forms.MessageBoxButtons]::YesNo,[System.Windows.Forms.MessageBoxIcon]::Warning)
 if($choice -eq [System.Windows.Forms.DialogResult]::Yes){
   $p=Get-RushAE
   if($p){try{$p.Refresh();if($p.MainWindowHandle -ne [IntPtr]::Zero){[void][RushWindow]::ShowWindow($p.MainWindowHandle,9)}; [void]$p.CloseMainWindow()}catch{}}
 }
})
$exitItem.add_Click({$script:running=$false})
# AE opens once when RushFinder starts. -r scripts for each job target the open Adobe session.
$p=Get-RushAE
if(!$p){
 foreach($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)})){
   if(!$base){continue}
   $dir=Join-Path $base 'Adobe'
   if(Test-Path $dir){
     $apps=Get-ChildItem $dir -Directory -ErrorAction SilentlyContinue | Where-Object {$_.Name -like 'Adobe After Effects*'} | Sort-Object Name -Descending
     foreach($a in $apps){
       $exe=Join-Path $a.FullName 'Support Files\AfterFX.exe'
       if(Test-Path $exe){try{$p=Start-Process -FilePath $exe -WindowStyle Minimized -PassThru -ErrorAction Stop;$script:trackedId=$p.Id}catch{};break}
     }
   }
   if($p){break}
 }
}
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval=750
$timer.add_Tick({if($script:wantHidden){Apply-WindowState}})
$timer.Start()
try {
 while($script:running){[System.Windows.Forms.Application]::DoEvents();Start-Sleep -Milliseconds 150}
}finally {
 $timer.Stop();$timer.Dispose();$tray.Visible=$false;$tray.Dispose();$menu.Dispose()
}
