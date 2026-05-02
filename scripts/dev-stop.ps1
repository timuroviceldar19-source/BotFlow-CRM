param(
    [switch]$Quiet
)

$ErrorActionPreference = "SilentlyContinue"

$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logsDir = Join-Path $workspace "runtime-logs"
$pidsFile = Join-Path $logsDir "dev-processes.json"

function Stop-Tree {
    param([int]$Pid)
    cmd.exe /c "taskkill /PID $Pid /T /F" | Out-Null
}

if (Test-Path $pidsFile) {
    $state = Get-Content $pidsFile -Raw | ConvertFrom-Json
    foreach ($service in $state.services) {
        Stop-Tree -Pid ([int]$service.pid)
    }
    Remove-Item $pidsFile -Force
}

$workspaceEscaped = [regex]::Escape($workspace)
$patterns = "uvicorn app.main:app|-m app.run_bot|next dev --hostname 127.0.0.1 --port 3000"
Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and $_.CommandLine -match $workspaceEscaped -and $_.CommandLine -match $patterns
} | ForEach-Object {
    Stop-Tree -Pid $_.ProcessId
}

foreach ($port in @(8000, 3000)) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Tree -Pid $_.OwningProcess
    }
}

if (-not $Quiet) {
    Write-Host "Stopped managed dev services."
}
