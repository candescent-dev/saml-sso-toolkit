Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---- Setup ----
$IMAGE_NAME = "oidc-sso-toolkit"
$TAG = "latest"
$CONTAINER_NAME = "oidc-sso-toolkit-container"

function Log {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function ErrorExit {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

# ---- Check if image exists ----
$ImageExists = docker images --format "{{.Repository}}:{{.Tag}}" |
    Select-String "${IMAGE_NAME}:${TAG}"

if (-not $ImageExists) {
    ErrorExit "Docker image ${IMAGE_NAME}:${TAG} not found. Please run build-image.ps1 first."
}

# ---- Stop and remove existing container if it exists ----
$ContainerExists = docker ps -a --format "{{.Names}}" |
    Select-String "$CONTAINER_NAME"

if ($ContainerExists) {
    Log "Stopping and removing existing container: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME" | Out-Null
    docker rm "$CONTAINER_NAME" | Out-Null
}

# ---- Extract backend port from config.json inside the image ----
Log "Reading backend port from config.json inside the image..."

$BACKEND_PORT = docker run --rm "${IMAGE_NAME}:${TAG}" sh -c 'jq -r ".backendPort" /app/config.json'

if ([string]::IsNullOrEmpty($BACKEND_PORT) -or $BACKEND_PORT -eq "null") {
    ErrorExit "Failed to read backendPort from config.json. Please check the file inside the image."
}

# ---- Extract frontend port from config.json inside the image ----
Log "Reading frontend port from config.json inside the image..."

$FRONTEND_PORT = docker run --rm "${IMAGE_NAME}:${TAG}" sh -c 'jq -r ".frontendPort" /app/config.json'

if ([string]::IsNullOrEmpty($FRONTEND_PORT) -or $FRONTEND_PORT -eq "null") {
    ErrorExit "Failed to read frontendPort from config.json. Please check the file inside the image."
}

# ---- Run the container ----
Log "Starting container: $CONTAINER_NAME"
Log "Port mapping: ${BACKEND_PORT}:${BACKEND_PORT} (backend), ${FRONTEND_PORT}:${FRONTEND_PORT} (frontend)"
Log "Image: ${IMAGE_NAME}:${TAG}"

docker run -d `
    --name "$CONTAINER_NAME" `
    -p "${BACKEND_PORT}:${BACKEND_PORT}" `
    -p "${FRONTEND_PORT}:${FRONTEND_PORT}" `
    "${IMAGE_NAME}:${TAG}"

# ---- Check logs for errors ----
Log "Checking container logs for errors..."
$LOG_OUTPUT = docker logs "$CONTAINER_NAME" | Select-Object -Last 50

if ($LOG_OUTPUT -match "error|exception|failed") {
    ErrorExit "Startup errors detected in container logs. Please check logs using: docker logs -f $CONTAINER_NAME"
}

# ---- Success Message ----
Log "Container started successfully!"
$ContainerId = docker ps --filter "name=$CONTAINER_NAME" --format "{{.ID}}"
Log "Container ID: $ContainerId"
Log "Backend: http://localhost:$BACKEND_PORT"
Log "Frontend: http://localhost:$FRONTEND_PORT"
Log ""
Log "To view logs: docker logs -f $CONTAINER_NAME"
Log "To stop container: docker stop $CONTAINER_NAME"
Log "To remove container: docker rm $CONTAINER_NAME"
Log "Web application is now running!"