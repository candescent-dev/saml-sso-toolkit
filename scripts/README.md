# Scripts Folder

This `scripts` folder contains utility scripts that support building, running, and validating the Simple Web App project. These scripts are designed to streamline local development, containerization, and health checks.

---

## Script Descriptions

### `init.sh`
Initializes the build process by creating Docker images for the application.

**Key Actions:**
- Builds Docker Image

### `run-web-app.sh`
Runs the web application using the Docker image created by `init.sh`.

**Key Actions:**
- Starts a Docker container from the built image
- Exposes necessary ports for frontend and backend services

### `selftest.sh`
Performs a health check on the running application to ensure all services are operational.

**Key Actions:**
- Sends test requests to verify service availability
- Logs the status of each component

### `local-build.sh`

The `local-build.sh` script is designed to help developers test the build process locally by generating a ZIP package of the project. This mimics the behavior of the CI/CD pipeline but runs entirely on a developer's machine.

**Key Actions:**

- Builds frontend and backend modules
- Packages necessary files and directories
- Creates a ZIP archive in the `dist/` folder for local testing
---

## Notes
- Ensure Docker is installed and running before executing these scripts.
