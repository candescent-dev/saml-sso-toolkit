#!/usr/bin/env bash
set -euo pipefail
 
# ---- Setup ----
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
TMP_DIR="$(mktemp -d)"
TARGET=${1:-all}
 
# ---- Helpers ----
log() {
  echo -e "\033[1;34m[INFO]\033[0m $*"
}
warn() {
  echo -e "\033[1;33m[WARN]\033[0m $*"
}
error_exit() {
  echo -e "\033[1;31m[ERROR]\033[0m $*" >&2
  exit 1
}

# --- Function to safely copy a file if it exists ---
safe_copy_file() {
  local src="$1"
  local dest="$2"
  local label="$3"

  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    log "Copied $label"
  fi
}

# --- Function to safely copy a directory if it exists ---
safe_copy_dir() {
  local src="$1"
  local dest="$2"
  local label="$3"

  if [ -d "$src" ]; then
    mkdir -p "$(dirname "$dest")"
    cp -r "$src" "$dest"
    log "Copied $label"
  fi
}
 
 
# ---- Delete dist directory ----
rm -rf "$DIST_DIR"
# ---- Create dist directory ----
mkdir -p "$DIST_DIR"
 
# ---- Build functions ----
build_frontend() {
  log "Building frontend..."
  pushd "$ROOT_DIR/sample-web-app/frontend" > /dev/null
  npm ci
  npm run build
  popd > /dev/null
}
 
build_backend() {
  log "Building backend..."
  pushd "$ROOT_DIR/sample-web-app/backend" > /dev/null
  npm ci
  npm run build
  npm test
  npm run test:e2e
  popd > /dev/null
}
 
log "Starting local build for target(s): $TARGET"
case "$TARGET" in
  all)
    build_frontend
    build_backend
    ;;
  *frontend*)
    build_frontend
    ;;
  *backend*)
    build_backend
    ;;
  *)
    error_exit "Unknown target: $TARGET"
    ;;
esac
 
# ---- Package additional resources ----
log "Copying scripts, documentation, and Dockerfile..."
 
# Create the required directory structure
mkdir -p "$TMP_DIR/sample-web-app/frontend"
mkdir -p "$TMP_DIR/sample-web-app/backend"
mkdir -p "$TMP_DIR/sample-web-app/scripts"
mkdir -p "$TMP_DIR/documentation"
 
# Copy sample-web-app build files only (from the built frontend/backend to sample-web-app structure)
# --- Copy frontend files ---
safe_copy_dir  "$ROOT_DIR/sample-web-app/frontend/build"                      "$TMP_DIR/sample-web-app/frontend/"              "frontend build files"
safe_copy_file "$ROOT_DIR/sample-web-app/frontend/package.json"      "$TMP_DIR/sample-web-app/frontend/package.json"       "frontend package.json"

# --- Copy backend files ---
safe_copy_dir  "$ROOT_DIR/sample-web-app/backend/dist"              "$TMP_DIR/sample-web-app/backend/"               "backend build files"
safe_copy_file "$ROOT_DIR/sample-web-app/backend/package.json"      "$TMP_DIR/sample-web-app/backend/package.json"        "backend package.json"
safe_copy_file "$ROOT_DIR/sample-web-app/backend/cache.json"        "$TMP_DIR/sample-web-app/backend/cache.json"       "backend cache.json"

# Copy scripts
safe_copy_dir  "$ROOT_DIR/scripts/shell"                        "$TMP_DIR/sample-web-app/scripts/"               "shell scripts"
safe_copy_dir  "$ROOT_DIR/scripts/ps"                        "$TMP_DIR/sample-web-app/scripts/"               "power shell scripts"

# Copy main README.md
cp "$ROOT_DIR/sample-web-app/README.md" "$TMP_DIR/sample-web-app/" || warn "Main README.md not found"
 
# Copy Dockerfile & Json files
cp "$ROOT_DIR/sample-web-app/Dockerfile" "$TMP_DIR/sample-web-app/" || warn "Dockerfile not found"
cp "$ROOT_DIR/sample-web-app/config.json" "$TMP_DIR/sample-web-app/config.json" || warn "config.json not found"

# Copy main README.md
cp "$ROOT_DIR/README.md" "$TMP_DIR/" || warn "Main README.md not found"

# Copy documentation (excluding README.md to avoid duplication)
if [ -d "$ROOT_DIR/documentation" ]; then
  mkdir -p "$TMP_DIR/documentation"
  # Copy all files except README.md
  find "$ROOT_DIR/documentation" -type f ! -name "README.md" -exec cp {} "$TMP_DIR/documentation/" \; 2>/dev/null || true
  log "Copied documentation files (excluding README.md)"
fi
 

# ---- Check for Dockerfile before proceeding ----
DOCKERFILE_PATH="$TMP_DIR/sample-web-app/Dockerfile"
if [ ! -f "$DOCKERFILE_PATH" ]; then
  error_exit "Dockerfile not found. Aborting ZIP creation."
fi

# ---- Create ZIP ----
ZIP_NAME="saml-sso-toolkit.zip"
pushd "$TMP_DIR" > /dev/null
zip -r "$DIST_DIR/$ZIP_NAME" ./* > /dev/null
popd > /dev/null
 
# ---- Output summary ----
log "Packaged ZIP: $DIST_DIR/$ZIP_NAME"

 
# ---- Cleanup ----
rm -rf "$TMP_DIR"
log "Temporary files cleaned."

