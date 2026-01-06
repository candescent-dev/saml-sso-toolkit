Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---- Setup ----
$CONTAINER_NAME = "oidc-sso-toolkit-container"
$MAX_RETRIES = 5
$RETRY_INTERVAL = 2

$IMAGE_NAME = "oidc-sso-toolkit"
$TAG = "latest"

function Log { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Warn { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function ErrorExit { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red; exit 1 }
function Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }

function CheckContainerStatus {
    if (-not (docker ps --format "{{.Names}}" | Select-String $CONTAINER_NAME)) {
        ErrorExit "Container '$CONTAINER_NAME' is not running. Please run run-container.ps1 first."
    }
    Log "Container '$CONTAINER_NAME' is running"
}

function CheckHealth {
    param([string]$Url, [string]$Label)
    $retryCount = 0
    Log "Checking $Label health at $Url"
    while ($retryCount -lt $MAX_RETRIES) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 | Out-Null
            Success "$Label is responding at $Url"
            return
        } catch {
            $retryCount++
            Log "Attempt ${retryCount}/${MAX_RETRIES}: $Label not ready yet, waiting ${RETRY_INTERVAL}s..."
            Start-Sleep -Seconds $RETRY_INTERVAL
        }
    }
    ErrorExit "$Label failed to respond after $($MAX_RETRIES * $RETRY_INTERVAL) seconds"
}


function CheckContainerLogs {
    Log "Checking container logs for errors..."
    $logs = docker logs $CONTAINER_NAME
    $errorMatches = $logs | Select-String -Pattern "error|exception|failed" -CaseSensitive

    if ($errorMatches -and $errorMatches.Count -gt 0) {
        Warn "Found $($errorMatches.Count) potential errors in container logs:"
        $errorMatches | Select-Object -First 5 | ForEach-Object { $_.Line }
    } else {
        Success "No errors found in container logs"
    }
}

function GetBackendPort {
    Log "Reading backend port from config.json inside the image..."
    $port = docker run --rm "${IMAGE_NAME}:${TAG}" sh -c 'jq -r ".backendPort" /app/config.json'
    if ([string]::IsNullOrEmpty($port) -or $port -eq "null") {
        ErrorExit "Failed to read backendPort from config.json. Please check the file inside the image."
    }
    return $port
}

function GetFrontendPort {
    Log "Reading frontend port from config.json inside the image..."
    $port = docker run --rm "${IMAGE_NAME}:${TAG}" sh -c 'jq -r ".frontendPort" /app/config.json'
    if ([string]::IsNullOrEmpty($port) -or $port -eq "null") {
        ErrorExit "Failed to read frontendPort from config.json. Please check the file inside the image."
    }
    return $port
}

# ---- Main Execution ----
Log "Starting application self-test..."
CheckContainerStatus

$BACKEND_PORT = GetBackendPort
$FRONTEND_PORT = GetFrontendPort
$FRONTEND_URL = "http://localhost:${FRONTEND_PORT}"
$BACKEND_URL  = "http://localhost:${BACKEND_PORT}/api/health"

Log "Frontend Port: $FRONTEND_PORT"
Log "Backend Port: $BACKEND_PORT"
Log ""

CheckHealth $FRONTEND_URL "Frontend"
CheckHealth $BACKEND_URL "Backend"