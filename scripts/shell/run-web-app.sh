#!/usr/bin/env bash
set -euo pipefail

# ---- Setup ----
IMAGE_NAME="oidc-sso-toolkit"
TAG="latest"
CONTAINER_NAME="oidc-sso-toolkit-container"

# ---- Helpers ----
log() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
error_exit() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }


# ---- Check if image exists with retry ----
MAX_RETRIES=5
RETRY_INTERVAL=2
retry_count=0

while ! docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^$IMAGE_NAME:$TAG$"; do
  if [ $retry_count -ge $MAX_RETRIES ]; then
    error_exit "Docker image $IMAGE_NAME:$TAG not found after retries. Please run ./scripts/shell/init.sh first."
  fi
  log "Image $IMAGE_NAME:$TAG not found. Retrying in $RETRY_INTERVAL seconds..."
  sleep $RETRY_INTERVAL
  retry_count=$((retry_count + 1))
done

# ---- Stop and remove existing container if it exists ----
if docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
  log "Stopping and removing existing container: $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || error_exit "Failed to remove container"

  # Ensure container is fully removed
  while docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; do
    log "Waiting for container removal..."
    sleep 1
  done
fi

# ---- Extract backend port from config.json inside the image ----
log "Reading backend port from config.json inside the image..."
BACKEND_PORT=$(docker run --rm "$IMAGE_NAME:$TAG" sh -c 'jq -r ".backendPort" /app/config.json')

if [[ -z "$BACKEND_PORT" || "$BACKEND_PORT" == "null" ]]; then
  error_exit "Failed to read backendPort from config.json. Please check the file inside the image."
fi

# ---- Extract frontend port from config.json inside the image ----
log "Reading frontend port from config.json inside the image..."
FRONTEND_PORT=$(docker run --rm "$IMAGE_NAME:$TAG" sh -c 'jq -r ".frontendPort" /app/config.json')

if [[ -z "$FRONTEND_PORT" || "$FRONTEND_PORT" == "null" ]]; then
  error_exit "Failed to read frontendPort from config.json. Please check the file inside the image."
fi

# ---- Run the container ----
log "Starting container: $CONTAINER_NAME"
log "Port mapping: $BACKEND_PORT:$BACKEND_PORT (backend), $FRONTEND_PORT:$FRONTEND_PORT (frontend)"
log "Image: $IMAGE_NAME:$TAG"

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$BACKEND_PORT:$BACKEND_PORT" \
  -p "$FRONTEND_PORT:$FRONTEND_PORT" \
  "$IMAGE_NAME:$TAG"

# ---- Check logs for errors ----
log "Checking container logs for errors..."
LOG_OUTPUT=$(docker logs "$CONTAINER_NAME" 2>&1 | tail -n 50)

if echo "$LOG_OUTPUT" | grep -Ei "error|exception|failed"; then
  error_exit "Startup errors detected in container logs. Please check logs using: docker logs -f $CONTAINER_NAME"
fi

# ---- Success Message ----
log "Container started successfully!"
log "Container ID: $(docker ps -q -f name=$CONTAINER_NAME)"
log "Backend: http://localhost:$BACKEND_PORT"
log "Frontend: http://localhost:$FRONTEND_PORT"
log ""
log "To view logs: docker logs -f $CONTAINER_NAME"
log "To stop container: docker stop $CONTAINER_NAME"
log "To remove container: docker rm $CONTAINER_NAME"
log "Web application is now running!"