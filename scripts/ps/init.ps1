Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Script is located inside: sample-web-app/scripts/ps/
$SCRIPT_DIR  = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SCRIPTS_DIR = Split-Path -Parent $SCRIPT_DIR       # sample-web-app/scripts
$WEBAPP_DIR  = Split-Path -Parent $SCRIPTS_DIR      # sample-web-app

$DOCKERFILE_PATH = Join-Path $WEBAPP_DIR "Dockerfile"
$IMAGE_NAME = "oidc-sso-toolkit"
$TAG = "latest"

function Log {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function ErrorExit {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

# ---- Check if Dockerfile exists ----
Log "Checking Dockerfile at: $DOCKERFILE_PATH"

if (-Not (Test-Path $DOCKERFILE_PATH)) {
    ErrorExit "Dockerfile not found at $DOCKERFILE_PATH"
}

# ---- Build Docker image ----
Log "Building Docker image: ${IMAGE_NAME}:${TAG}"
Log "Using Dockerfile: $DOCKERFILE_PATH"

docker build -t "${IMAGE_NAME}:${TAG}" -f "$DOCKERFILE_PATH" "$WEBAPP_DIR"

if ($LASTEXITCODE -eq 0) {
    Log "Docker image built successfully: ${IMAGE_NAME}:${TAG}"

    # Escape Go template so PowerShell does NOT try to parse {{ .ID }}
    $template = '{{.ID}}'
    $ImageId = docker images --format $template "${IMAGE_NAME}:${TAG}"

    Log "Image ID: $ImageId"
} else {
    ErrorExit "Failed to build Docker image"
}

Log "Docker image build completed!"