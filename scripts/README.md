## Scripts Overview

This `scripts` folder contains utility scripts that support building, packaging, running, and validating the OIDC SSO Toolkit project.  
Scripts are provided for both **Linux/macOS (shell)** and **Windows (PowerShell)**.

---

## Script Descriptions

### `local-build.sh` / `local-build.ps1`

These scripts build the sample web app and create the distributable ZIP package that mimics the CI/CD pipeline artifact.

**Key Actions:**
- Build **frontend** (`sample-web-app/frontend`) and **backend** (`sample-web-app/backend`) using `npm ci` and project build scripts.
- Run backend tests and e2e tests.
- Package:
  - Built frontend (`build/`)
  - Built backend (`dist/`)
  - `sample-web-app/Dockerfile`
  - `sample-web-app/config.json`
  - Shell scripts (`scripts/shell`) and PowerShell scripts (`scripts/ps`)
  - Main `README.md` and documentation files
- Produce `dist/oidc-sso-feature-toolkit.zip`.

### Shell scripts (`scripts/shell`)

#### `init.sh`
Builds the Docker image for the toolkit using the `sample-web-app/Dockerfile`.

**Key Actions:**
- Validates the presence of the Dockerfile.
- Builds image `saml-sso-toolkit:latest`.
- Logs the built image ID.

#### `run-web-app.sh`
Runs the web application in Docker using the image built by `init.sh`.

**Key Actions:**
- Verifies that the `saml-sso-toolkit:latest` image exists (with retries).
- Reads `backendPort` and `frontendPort` from `/app/config.json` inside the image.
- Starts container `saml-sso-toolkit-container`.
- Maps ports:
  - `backendPort:backendPort`
  - `frontendPort:frontendPort`
- Outputs URLs and basic usage hints.

#### `selftest.sh`
Performs a self-test/health check against the running container.

**Key Actions:**
- Verifies that `saml-sso-toolkit-container` is running.
- Reads `backendPort` and `frontendPort` from `/app/config.json` inside the image.
- Checks:
  - Frontend root: `http://localhost:<frontendPort>`
  - Backend health: `http://localhost:<backendPort>/api/health`
- Scans container logs for error/exception/failed messages.

### PowerShell scripts (`scripts/ps`)

#### `init.ps1`
Builds the Docker image for the toolkit on Windows.

**Key Actions:**
- Locates `sample-web-app/Dockerfile`.
- Builds image `saml-sso-toolkit:latest`.
- Outputs built image ID.

#### `run-web-app.ps1`
Runs the web application container on Windows using the existing image.

**Key Actions:**
- Confirms image `saml-sso-toolkit:latest` exists.
- Reads `backendPort` from `/app/config.json` inside the image.
- Starts container `saml-sso-toolkit-container` with port mappings:
  - `backendPort:backendPort`
  - `frontendPort:frontendPort` (default 8000, can be passed as first argument).
- Prints container ID and URLs.

#### `selftest.ps1`
Runs a health check against the running container on Windows.

**Key Actions:**
- Confirms container `saml-sso-toolkit-container` is running.
- Reads `backendPort` from `/app/config.json` inside the image.
- Verifies:
  - Frontend: `http://localhost:<frontendPort>` (default 8000 or provided argument).
  - Backend health: `http://localhost:<backendPort>/api/health`.
- Scans container logs for error/exception/failed messages.

---

## Notes

- Ensure **Docker** is installed and running before executing container-related scripts.
- Ensure **Node.js** and **npm** are installed before running `local-build` (it uses `npm ci` and project build/test scripts).

---

## Getting Started

### 1. Create ZIP locally

From the repository root:

```bash
./scripts/local-build.sh             # Linux/macOS
./scripts/local-build.ps1           # Windows PowerShell
```

The ZIP (`oidc-sso-feature-toolkit.zip`) will be created under the `dist/` folder.

### 2. Build Docker image

Navigate to the `scripts` folder (or call with full path) and run:

```bash
./scripts/shell/init.sh             # Linux/macOS
./scripts/ps/init.ps1               # Windows PowerShell
```

### 3. Run the application

After the image is built, start the container:

```bash
./scripts/shell/run-web-app.sh      # Linux/macOS
./scripts/ps/run-web-app.ps1        # Windows PowerShell
```

Ports are read from `config.json` inside the image. By default (if using the provided config):

```text
frontend: 8000
backend : 9000
```

### 4. Health check / self-test

To verify that the application is running correctly:

```bash
./scripts/shell/selftest.sh         # Linux/macOS
./scripts/ps/selftest.ps1           # Windows PowerShell
```

These scripts:
- Confirm the container is running.
- Check frontend and backend health endpoints.
- Inspect logs for potential errors.
