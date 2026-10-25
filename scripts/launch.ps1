param([double]$Hours = 12, [Parameter(Mandatory)][string]$StateFile)
# Opens keep-awake.ps1 in a new Windows Terminal tab. Started straight from
# Claude Code, wt's tab never appears (whatever Claude Code starts is closed
# with the command), so the launch goes through a shortcut that Explorer
# opens: Explorer starts Windows Terminal on its own.
$dir = Split-Path $StateFile
New-Item -ItemType Directory -Force $dir | Out-Null
$lnk = Join-Path $dir 'launch.lnk'
$pwsh = 'C:\Program Files\PowerShell\7\pwsh.exe'
$script = Join-Path $PSScriptRoot 'keep-awake.ps1'
$hoursText = $Hours.ToString([Globalization.CultureInfo]::InvariantCulture)

$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$shortcut.TargetPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\wt.exe'
$shortcut.Arguments = "-w 0 new-tab --title Keep-awake `"$pwsh`" -NoExit -NoProfile -ExecutionPolicy Bypass -File `"$script`" -Hours $hoursText -StateFile `"$StateFile`""
$shortcut.Save()

& "$env:WINDIR\explorer.exe" $lnk
