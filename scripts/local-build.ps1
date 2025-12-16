Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---- Setup ----
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ROOT_DIR   = Split-Path -Parent $SCRIPT_DIR   # Now points to project root (saml-sso-toolkit)
$DIST_DIR   = Join-Path $ROOT_DIR "dist"
$TMP_DIR    = New-Item -ItemType Directory -Path ([System.IO.Path]::GetTempPath() + [System.Guid]::NewGuid().ToString())
$TARGET     = if ($args.Count -ge 1) { $args[0] } else { "all" }

# ---- Helpers ----
function Log { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Warn { param([string]$Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function ErrorExit { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red; exit 1 }

function SafeCopyFile {
    param([string]$Src, [string]$Dest, [string]$Label)
    if (Test-Path $Src) {
        New-Item -ItemType Directory -Force -Path (Split-Path $Dest) | Out-Null
        Copy-Item $Src $Dest -Force
        Log "Copied $Label"
    }
}

function SafeCopyDir {
    param([string]$Src, [string]$Dest, [string]$Label)
    if (Test-Path $Src) {
        New-Item -ItemType Directory -Force -Path $Dest | Out-Null
        Copy-Item $Src $Dest -Recurse -Force
        Log "Copied $Label"
    }
}

# ---- Delete and recreate dist directory ----
if (Test-Path $DIST_DIR) { Remove-Item $DIST_DIR -Recurse -Force }
New-Item -ItemType Directory -Path $DIST_DIR | Out-Null

# ---- Build functions ----
function BuildFrontend {
    $FRONTEND_DIR = Join-Path $ROOT_DIR "sample-web-app/frontend"
    if (-not (Test-Path $FRONTEND_DIR)) { ErrorExit "Frontend directory not found: $FRONTEND_DIR" }
    Log "Building frontend..."
    Push-Location $FRONTEND_DIR
    cmd /c "npm ci"
    cmd /c "npm run build"
    Pop-Location
}
 
function BuildBackend {
    $BACKEND_DIR = Join-Path $ROOT_DIR "sample-web-app/backend"
    if (-not (Test-Path $BACKEND_DIR)) { ErrorExit "Backend directory not found: $BACKEND_DIR" }
    Log "Building backend..."
    Push-Location $BACKEND_DIR
    cmd /c "npm ci"
    cmd /c "npm run build"
    cmd /c "npm test"
    cmd /c "npm run test:e2e"
    Pop-Location
}

Log "Starting local build for target(s): $TARGET"
switch -Regex ($TARGET) {
    "all"       { BuildFrontend; BuildBackend }
    "frontend"  { BuildFrontend }
    "backend"   { BuildBackend }
    default     { ErrorExit "Unknown target: $TARGET" }
}

# ---- Package additional resources ----
Log "Copying scripts, documentation, and Dockerfile..."

# Create required directory structure
$TMP_FRONTEND_DIR = Join-Path $TMP_DIR "sample-web-app/frontend"
$TMP_BACKEND_DIR  = Join-Path $TMP_DIR "sample-web-app/backend"
$TMP_SCRIPTS_DIR  = Join-Path $TMP_DIR "sample-web-app/scripts"

New-Item -ItemType Directory -Force -Path $TMP_FRONTEND_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $TMP_BACKEND_DIR  | Out-Null
New-Item -ItemType Directory -Force -Path $TMP_SCRIPTS_DIR  | Out-Null

# Copy frontend files
SafeCopyDir (Join-Path $ROOT_DIR "sample-web-app/frontend/build") $TMP_FRONTEND_DIR "frontend build files"
SafeCopyFile (Join-Path $ROOT_DIR "sample-web-app/frontend/package.json") (Join-Path $TMP_FRONTEND_DIR "package.json") "frontend package.json"

# Copy backend files
SafeCopyDir (Join-Path $ROOT_DIR "sample-web-app/backend/dist") $TMP_BACKEND_DIR "backend build files"
SafeCopyFile (Join-Path $ROOT_DIR "sample-web-app/backend/package.json") (Join-Path $TMP_BACKEND_DIR "package.json") "backend package.json"
SafeCopyFile (Join-Path $ROOT_DIR "sample-web-app/backend/cache.json") (Join-Path $TMP_DIR "sample-web-app/backend/cache.json") "backend cache.json"

# Copy scripts
SafeCopyDir (Join-Path $ROOT_DIR "scripts/ps")   $TMP_SCRIPTS_DIR "power shell scripts "
SafeCopyDir (Join-Path $ROOT_DIR "scripts/shell") $TMP_SCRIPTS_DIR "shell scripts"

# Copy Dockerfile & Json files
SafeCopyFile (Join-Path $ROOT_DIR "sample-web-app/Dockerfile") (Join-Path $TMP_DIR "sample-web-app/Dockerfile") "Dockerfile"
SafeCopyFile (Join-Path $ROOT_DIR "sample-web-app/config.json") (Join-Path $TMP_DIR "sample-web-app/config.json") "config.json"

# ---- Check for Dockerfile before proceeding ----
$DOCKERFILE_PATH = Join-Path $TMP_DIR "sample-web-app/Dockerfile"
if (-not (Test-Path $DOCKERFILE_PATH)) {
    ErrorExit "Dockerfile not found. Aborting packaging."
}

Log "Local build and packaging preparation completed successfully!"


# ---- Create ZIP ----
$ZIP_NAME = "saml-sso-toolkit.zip"
$ZIP_PATH = Join-Path $DIST_DIR $ZIP_NAME

Log "Creating ZIP package..."

Push-Location $TMP_DIR
Compress-Archive -Path * -DestinationPath $ZIP_PATH -Force
Pop-Location

# ---- Output summary ----
Log "Packaged ZIP: $ZIP_PATH"

# ---- Cleanup ----
Log "Cleaning temporary files..."
Remove-Item -Recurse -Force $TMP_DIR

Log "Temporary files cleaned."