$ErrorActionPreference = "SilentlyContinue"

$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logsDir = Join-Path $workspace "runtime-logs"
$pidsFile = Join-Path $logsDir "dev-processes.json"

function Test-PidAlive {
    param([int]$ProcessId)
    return (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) -ne $null
}

function Test-PortOpen {
    param(
        [string]$HostName,
        [int]$Port
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        $ok = $async.AsyncWaitHandle.WaitOne(500)
        if (-not $ok) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

if (-not (Test-Path $pidsFile)) {
    Write-Output "No managed dev session found."
    exit 0
}

$state = Get-Content $pidsFile -Raw | ConvertFrom-Json
foreach ($service in $state.services) {
    $servicePid = [int]$service.pid
    $running = if (Test-PidAlive -ProcessId $servicePid) { "true" } else { "false" }
    Write-Host ($service.name + ": pid=" + $servicePid + " running=" + $running)
}
Write-Host ""
Write-Host ("API port 8000: " + (Test-PortOpen -HostName "127.0.0.1" -Port 8000))
Write-Host ("Web port 3000: " + (Test-PortOpen -HostName "127.0.0.1" -Port 3000))
Write-Host ("Database: " + $state.databaseUrl)
