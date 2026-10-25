# Mimi: launch OBS output plus independent/minimizable controller (Windows).
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$base='http://127.0.0.1:5173'
$chromeCandidates=@(
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$chrome=$chromeCandidates|Where-Object{Test-Path $_}|Select-Object -First 1
if(-not $chrome){throw 'Install Google Chrome first.'}
$npm=(Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if(-not $npm){throw 'Install Node.js 22+ / npm first.'}
if(-not(Test-Path (Join-Path $root 'node_modules'))){
  Push-Location $root
  try {& $npm ci;if($LASTEXITCODE -ne 0){throw 'npm ci failed'}}
  finally{Pop-Location}
}
function Test-Mimi {
 try{(Invoke-WebRequest "$base/__mimi_bridge?view=engine" -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200}catch{$false}
}
if(-not(Test-Mimi)){
 Start-Process -FilePath $npm -ArgumentList @('run','dev') -WorkingDirectory $root -WindowStyle Minimized
 $ok=$false
 for($i=0;$i -lt 40;$i++){Start-Sleep -Milliseconds 500;if(Test-Mimi){$ok=$true;break}}
 if(-not $ok){throw 'Local Mimi server could not start. Check npm run dev.'}
}
$profile=Join-Path $env:LOCALAPPDATA 'Mimi\obs-engine-profile'
New-Item -ItemType Directory -Force $profile | Out-Null
$engine=Get-CimInstance Win32_Process -Filter "name='chrome.exe'"|
  Where-Object{$_.CommandLine -and $_.CommandLine.Contains($profile)}|Select-Object -First 1
if(-not $engine){
 $args=@("--user-data-dir=$profile","--app=$base/?obs=output",
    '--window-size=1280,720','--window-position=25,30',
    '--use-fake-ui-for-media-stream','--test-type','--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling','--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling')
 Start-Process -FilePath $chrome -ArgumentList $args
}
# Window Capture needs a non-minimized video window. Park it offscreen; minimize controls only.
if(-not ('MimiWindowHost' -as [type])){
 Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class MimiWindowHost {
  [DllImport("user32.dll", CharSet=CharSet.Unicode)]
  public static extern IntPtr FindWindow(string cls, string title);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hwnd, int cmd);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int w, int h, uint flags);
}
'@
}
$output=[IntPtr]::Zero
for($i=0;$i -lt 36;$i++){
 $output=[MimiWindowHost]::FindWindow($null,'Mimi Avatar Output')
 if($output -ne [IntPtr]::Zero){break}
 Start-Sleep -Milliseconds 350
}
if($output -eq [IntPtr]::Zero){throw 'Mimi Avatar Output window did not launch.'}
[MimiWindowHost]::ShowWindow($output,8)|Out-Null
[MimiWindowHost]::SetWindowPos($output,[IntPtr]::Zero,-1700,40,1280,720,0x0010 -bor 0x0004)|Out-Null
$controls=[MimiWindowHost]::FindWindow($null,'Mimi | Cartoon Camera')
if($controls -eq [IntPtr]::Zero){
 Start-Process -FilePath $chrome -ArgumentList @("--app=$base/?obs=1",'--window-size=1400,870')
}else{
 [MimiWindowHost]::ShowWindow($controls,9)|Out-Null
 [MimiWindowHost]::SetForegroundWindow($controls)|Out-Null
}
$obs=Join-Path $env:ProgramFiles 'obs-studio\bin\64bit\obs64.exe'
if((Test-Path $obs)-and-not(Get-Process obs64 -ErrorAction SilentlyContinue)){
 Start-Process -FilePath $obs -WorkingDirectory (Split-Path $obs) -ArgumentList @('--startvirtualcam')
}
Write-Host 'Mimi is running. You may minimize the controller.'
Write-Host 'Use OBS Window Capture: Mimi Avatar Output. Configure the source in OBS first.'
