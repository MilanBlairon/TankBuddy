# Installs the price scraper as a per-user Scheduled Task: runs 1 min after every logon + daily 12:00 (fallback).
# - Copies the scraper to %LOCALAPPDATA%\TankBuddy\scraper (outside OneDrive: no sync problems, key stays local)
# - Needs %LOCALAPPDATA%\TankBuddy\serviceAccount.json (Firebase service-account key)
# Re-run this script after changing scrape.mjs / stations-seed.json.   Uninstall: Unregister-ScheduledTask TankBuddy-Prijzen -Confirm:$false
$ErrorActionPreference = 'Stop'
$src  = $PSScriptRoot
$base = Join-Path $env:LOCALAPPDATA 'TankBuddy'
$dst  = Join-Path $base 'scraper'
if (-not (Test-Path (Join-Path $base 'serviceAccount.json'))) { throw "Missing $base\serviceAccount.json" }
New-Item -ItemType Directory -Force $dst | Out-Null
foreach ($f in 'scrape.mjs','decode.mjs','key.mjs','stations-seed.json','package.json','package-lock.json') { Copy-Item (Join-Path $src $f) $dst -Force }
Push-Location $dst; npm install --omit=dev --silent 2>&1 | Out-Null; Pop-Location

$node = (Get-Command node).Source
$vbs  = Join-Path $dst 'run-scrape.vbs'
@"
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "$dst"
sh.Run """$node"" ""$dst\scrape.mjs""", 0, True
"@ | Set-Content $vbs -Encoding ASCII

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "//B //Nologo `"$vbs`"" -WorkingDirectory $dst
$logon  = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"; $logon.Delay = 'PT1M'
$daily  = New-ScheduledTaskTrigger -Daily -At 12:00
$set    = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName 'TankBuddy-Prijzen' -Action $action -Trigger @($logon, $daily) -Settings $set -Description 'TankBuddy: download DATS24 fuel prices to Firebase (skips if <6h ago)' -Force | Out-Null
Write-Host "Installed. Task 'TankBuddy-Prijzen' -> $dst  (log: $dst\scrape.log)"
