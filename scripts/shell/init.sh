#!/usr/bin/env bash
set -euo pipefail

# ---- Setup ----
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOCKERFILE_PATH="$ROOT_DIR/Dockerfile"
IMAGE_NAME="oidc-sso-toolkit"
TAG="latest"

# ---- Helpers ----
log() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
error_exit() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }

# ---- Check if Dockerfile exists ----
if [ ! -f "$DOCKERFILE_PATH" ]; then
  error_exit "Dockerfile not found at $DOCKERFILE_PATH"
fi

# ---- Build Docker image ----
log "Building Docker image: $IMAGE_NAME:$TAG"
log "Using Dockerfile: $DOCKERFILE_PATH"

docker build -t "$IMAGE_NAME:$TAG" -f "$DOCKERFILE_PATH" "$ROOT_DIR"

log "Docker image built successfully: $IMAGE_NAME:$TAG"
log "Image ID: $(docker images -q $IMAGE_NAME:$TAG)"
log "Docker image build completed!"