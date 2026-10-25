param([double]$Hours = 12, [string]$StateFile)
$Host.UI.RawUI.WindowTitle = 'Keep-awake (Claude)'
Add-Type -Namespace W -Name P -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
# ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED. Written as a
# decimal uint32: in PowerShell 7, 0x80000003 parses as a negative int.
$flags = [uint32]2147483651
$end = (Get-Date).AddHours($Hours)
$label = $end.ToString('ddd h:mm tt')
if ($StateFile) {
  New-Item -ItemType Directory -Force (Split-Path $StateFile) | Out-Null
  @{ pid = $PID; endsAt = ([DateTimeOffset]$end).ToUnixTimeMilliseconds(); label = $label } |
    ConvertTo-Json -Compress | Set-Content -Encoding utf8 $StateFile
}
Write-Host "Keeping the laptop awake until $label. Close this tab to stop." -ForegroundColor Green
try {
  while ((Get-Date) -lt $end) {
    $r = [W.P]::SetThreadExecutionState($flags)
    if ($r -eq 0) { Write-Host "$(Get-Date -Format 'HH:mm:ss')  CALL FAILED (status 0)" -ForegroundColor Red }
    else { Write-Host "$(Get-Date -Format 'HH:mm:ss')  awake (status $r)" }
    $left = ($end - (Get-Date)).TotalSeconds
    if ($left -gt 0) { Start-Sleep -Seconds ([Math]::Min(300, [Math]::Ceiling($left))) }
  }
  Write-Host 'Finished. The laptop can sleep again.' -ForegroundColor Yellow
} finally {
  [void][W.P]::SetThreadExecutionState([uint32]2147483648)
  # Only remove our own status file: a newer tab may have replaced it.
  if ($StateFile -and (Test-Path $StateFile)) {
    $owner = try { (Get-Content $StateFile -Raw | ConvertFrom-Json).pid } catch { $null }
    if ($owner -eq $PID) { Remove-Item $StateFile -ErrorAction SilentlyContinue }
  }
}
