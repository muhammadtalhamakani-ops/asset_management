$ErrorActionPreference = 'Stop'
$repoDirectory = Split-Path $PSScriptRoot -Parent
$tunnelExecutable = Join-Path $repoDirectory '.tools/cloudflared.exe'
if (!(Test-Path -LiteralPath $tunnelExecutable)) { throw 'Install .tools/cloudflared.exe as described in docs/DEPLOYMENT.md first.' }
Push-Location $repoDirectory
$backendProcess = $null
$previousEnvironment = @{}
foreach ($name in @('SERVE_FRONTEND', 'ALLOW_REGISTRATION', 'HOST', 'PORT')) {
  $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
  $env:SERVE_FRONTEND = 'true'
  $env:ALLOW_REGISTRATION = 'false'
  $env:HOST = '127.0.0.1'
  $env:PORT = '5000'
  if (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 5000 is occupied. Stop the existing server before starting the demo.' }
  $backendProcess = Start-Process node -ArgumentList 'server.js' -WorkingDirectory (Join-Path $repoDirectory 'backend') -WindowStyle Hidden -PassThru
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ($backendProcess.HasExited) { throw 'Backend exited. Check MongoDB and SESSION_SECRET configuration.' }
    try {
      $health = Invoke-RestMethod 'http://127.0.0.1:5000/api/health'
      if ($health.status -eq 'OK' -and $health.databaseReady) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
  }
  if (!$ready) { throw 'Backend did not become database-ready within 60 seconds.' }
  Write-Host 'Share the https://...trycloudflare.com URL printed below. Ctrl+C stops this demo.'
  & $tunnelExecutable tunnel --url http://127.0.0.1:5000 --no-autoupdate
} finally {
  if ($backendProcess -and !$backendProcess.HasExited) { Stop-Process -Id $backendProcess.Id }
  foreach ($name in $previousEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process')
  }
  Pop-Location
}
