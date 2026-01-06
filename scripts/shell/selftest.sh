
#!/usr/bin/env bash
set -euo pipefail

# ---- Setup ----
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER_NAME="oidc-sso-toolkit-container"
MAX_RETRIES=5
RETRY_INTERVAL=2
IMAGE_NAME="oidc-sso-toolkit"
TAG="latest"

# ---- Helpers ----
log()    { printf "\033[1;34m[INFO]\033[0m %s\n" "$*"; }
warn()   { printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
error_exit() { printf "\033[1;31m[ERROR]\033[0m %s\n" "$*" >&2; exit 1; }
success(){ printf "\033[1;32m[SUCCESS]\033[0m %s\n" "$*"; }

# ---- Reliable Image Check with Retry ----
retry_count=0
while ! docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^$IMAGE_NAME:$TAG$"; do
  if [ $retry_count -ge $MAX_RETRIES ]; then
    error_exit "Docker image $IMAGE_NAME:$TAG not found after retries. Please build it first."
  fi
  log "Image $IMAGE_NAME:$TAG not found. Retrying in $RETRY_INTERVAL seconds..."
  sleep $RETRY_INTERVAL
  retry_count=$((retry_count + 1))
done

# ---- Check Container Status ----
check_container_status() {
  if ! docker ps --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
    error_exit "Container '$CONTAINER_NAME' is not running. Please run ./scripts/shell/run-web-app.sh first."
  fi
  log "Container '$CONTAINER_NAME' is running"
}

# ---- Health Check with Retry ----
check_health() {
  local url=$1
  local label=$2
  local retry_count=0

  log "Checking $label health at $url"
  while [ $retry_count -lt $MAX_RETRIES ]; do
    if curl -s -f "$url" >/dev/null 2>&1; then
      success "$label is responding at $url"
      return 0
    fi
    retry_count=$((retry_count + 1))
    log "Attempt $retry_count/$MAX_RETRIES: $label not ready yet, waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
  done
  error_exit "$label failed to respond after $((MAX_RETRIES * RETRY_INTERVAL)) seconds"
}

# ---- Check Container Logs ----
check_container_logs() {
  log "Checking container logs for errors..."
  local error_count
  error_count=$(docker logs "$CONTAINER_NAME" 2>&1 | grep -i "error\|exception\|failed" | wc -l)
  if [ "$error_count" -gt 0 ]; then
    warn "Found $error_count potential errors in container logs:"
    docker logs "$CONTAINER_NAME" 2>&1 | grep -i "error\|exception\|failed" | head -5
  else
    success "No errors found in container logs"
  fi
}

# ---- Get Backend Port ----
get_backend_port() {
  log "Reading backend port from config.json inside the image..." >&2  
  local port
  port=$(docker run --rm "$IMAGE_NAME:$TAG" sh -c 'jq -r ".backendPort" /app/config.json')

  if [[ -z "$port" || "$port" == "null" ]]; then
    error_exit "Failed to read backendPort from config.json. Please check the file inside the image."
  fi
  echo "$port"
}

# ---- Get Frontend Port ----
get_frontend_port() {
  log "Reading frontend port from config.json inside the image..." >&2  
  local port
  port=$(docker run --rm "$IMAGE_NAME:$TAG" sh -c 'jq -r ".frontendPort" /app/config.json')

  if [[ -z "$port" || "$port" == "null" ]]; then
    error_exit "Failed to read frontendPort from config.json. Please check the file inside the image."
  fi
  echo "$port"
}

# ---- Main Execution ----
log "Starting application self-test..."
check_container_status

BACKEND_PORT=$(get_backend_port)
FRONTEND_PORT=$(get_frontend_port)

FRONTEND_URL="http://localhost:$FRONTEND_PORT"
BACKEND_URL="http://localhost:$BACKEND_PORT/api/health"

log "Frontend Port: $FRONTEND_PORT"
log "Backend Port: $BACKEND_PORT"
log ""

check_health "$FRONTEND_URL" "Frontend"
check_health "$BACKEND_URL" "Backend"
