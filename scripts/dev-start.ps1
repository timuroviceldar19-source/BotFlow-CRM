param(
    [switch]$UseSqlite
)

$ErrorActionPreference = "Stop"

$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logsDir = Join-Path $workspace "runtime-logs"
$pidsFile = Join-Path $logsDir "dev-processes.json"
$envFile = Join-Path $workspace ".env"

function Read-EnvMap {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw ".env not found at $Path"
    }

    $map = @{}
    foreach ($line in Get-Content $Path) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith("#")) {
            continue
        }

        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $map[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
    return $map
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

function Escape-CmdValue {
    param([string]$Value)

    return $Value.Replace("^", "^^").Replace("&", "^&").Replace("|", "^|").Replace("<", "^<").Replace(">", "^>").Replace("(", "^(").Replace(")", "^)")
}

function Stop-StaleProcesses {
    param([string]$WorkspacePath)

    $patterns = @(
        "uvicorn app.main:app",
        "-m app.run_bot",
        "next dev --hostname 127.0.0.1 --port 3000"
    )

    $processes = Get-CimInstance Win32_Process | Where-Object {
        $commandLine = $_.CommandLine
        if (-not $commandLine -or -not $commandLine.Contains($WorkspacePath)) {
            return $false
        }

        foreach ($pattern in $patterns) {
            if ($commandLine -match [regex]::Escape($pattern)) {
                return $true
            }
        }
        return $false
    }

    foreach ($process in $processes) {
        cmd.exe /c "taskkill /PID $($process.ProcessId) /T /F" | Out-Null
    }

    foreach ($port in @(8000, 3000)) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
            cmd.exe /c "taskkill /PID $($_.OwningProcess) /T /F" | Out-Null
        }
    }
}

function Start-ManagedProcess {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Command,
        [hashtable]$EnvOverrides
    )

    $stdout = Join-Path $logsDir "$Name.out.log"
    $stderr = Join-Path $logsDir "$Name.err.log"
    if (Test-Path $stdout) { Remove-Item $stdout -Force }
    if (Test-Path $stderr) { Remove-Item $stderr -Force }

    $envPrefix = ""
    foreach ($key in $EnvOverrides.Keys) {
        $value = Escape-CmdValue $EnvOverrides[$key]
        $envPrefix += "set `"$key=$value`" && "
    }

    $fullCommand = "$envPrefix" + "cd /d `"$WorkingDirectory`" && $Command"
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $fullCommand -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    return @{
        name = $Name
        pid = $process.Id
        cwd = $WorkingDirectory
        stdout = $stdout
        stderr = $stderr
    }
}

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

if (Test-Path $pidsFile) {
    & (Join-Path $PSScriptRoot "dev-stop.ps1") -Quiet
}

Stop-StaleProcesses -WorkspacePath $workspace

$envMap = Read-EnvMap -Path $envFile
$databaseUrl = $envMap["DATABASE_URL"]
$resolvedDatabaseUrl = $databaseUrl

if ($UseSqlite -or (($databaseUrl -like "postgresql*") -and (-not (Test-PortOpen -HostName "127.0.0.1" -Port 5432)))) {
    $resolvedDatabaseUrl = "sqlite+aiosqlite:///./runtime.sqlite3"
}

$sharedApiBaseUrl = if ($envMap.ContainsKey("API_BASE_URL")) { $envMap["API_BASE_URL"] } else { "http://127.0.0.1:8000" }
$sharedAdminApiKey = if ($envMap.ContainsKey("ADMIN_API_KEY")) { $envMap["ADMIN_API_KEY"] } else { "" }
$sharedWebBaseUrl = if ($envMap.ContainsKey("WEB_BASE_URL")) { $envMap["WEB_BASE_URL"] } else { "http://127.0.0.1:3000" }
$sharedBotUsername = if ($envMap.ContainsKey("BOT_USERNAME")) { $envMap["BOT_USERNAME"] } else { "botflow_crm_bot" }

$botApiDir = Join-Path $workspace "apps\bot-api"
$botApiPython = Join-Path $botApiDir ".venv\Scripts\python.exe"
$botApiAlembic = Join-Path $botApiDir ".venv\Scripts\alembic.exe"

Write-Host "Running Alembic migrations..."
$previousDatabaseUrl = $env:DATABASE_URL
$env:DATABASE_URL = $resolvedDatabaseUrl
Push-Location $botApiDir
& .\.venv\Scripts\alembic.exe -c .\alembic.ini upgrade head
$migrationExitCode = $LASTEXITCODE
Pop-Location
if ($migrationExitCode -ne 0) {
    if ($null -eq $previousDatabaseUrl) {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    } else {
        $env:DATABASE_URL = $previousDatabaseUrl
    }
    throw "Alembic migration failed."
}
if ($null -eq $previousDatabaseUrl) {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
} else {
    $env:DATABASE_URL = $previousDatabaseUrl
}

$managed = @()
$managed += Start-ManagedProcess -Name "api" -WorkingDirectory $botApiDir -Command ".\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000" -EnvOverrides @{ DATABASE_URL = $resolvedDatabaseUrl }
$managed += Start-ManagedProcess -Name "bot" -WorkingDirectory $botApiDir -Command ".\.venv\Scripts\python.exe -m app.run_bot" -EnvOverrides @{ DATABASE_URL = $resolvedDatabaseUrl }
$managed += Start-ManagedProcess -Name "web" -WorkingDirectory (Join-Path $workspace "apps\web") -Command "npm.cmd run dev -- --hostname 127.0.0.1 --port 3000" -EnvOverrides @{ API_BASE_URL = $sharedApiBaseUrl; ADMIN_API_KEY = $sharedAdminApiKey; WEB_BASE_URL = $sharedWebBaseUrl; BOT_USERNAME = $sharedBotUsername }

$state = @{
    startedAt = (Get-Date).ToString("o")
    databaseUrl = $resolvedDatabaseUrl
    services = $managed
}

$state | ConvertTo-Json -Depth 6 | Set-Content -Path $pidsFile -Encoding utf8

Write-Host "Started dev services."
Write-Host "API: http://127.0.0.1:8000"
Write-Host "Web: http://127.0.0.1:3000/dashboard"
Write-Host "Database: $resolvedDatabaseUrl"
