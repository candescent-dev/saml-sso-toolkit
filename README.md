# SAML SSO Toolkit

A local development toolkit for partners and financial institutions (FIs) to build and test SAML Single Sign-On (SSO) integrations. This toolkit simulates a SAML Identity Provider, allowing you to develop and validate your SAML client implementation before connecting to production environments.

## Features

- **Mock SAML Identity Provider** - Full SAML 2.0 authentication flow
- **SAML Assertion Generation** - XML assertions with configurable attributes
- **Digital Signing** - RS256-signed assertions using Candescent's private key
- **Assertion Encryption** - Support for vendor-provided encryption certificates
- **E2E Validation** - Automated tests to verify your integration
- **Downloadable Artifacts** - Public key for signature verification

> **Note** - The following installation steps work across all operating systems, including macOS, Windows, and Linux.

## Quick Start - Local Machine Native Setup

### Prerequisites

- **Node.js** v20+ (LTS recommended)
- **npm** (included with Node.js)

### 1. Clone the Repository

```bash
git clone https://github.com/candescent-dev/saml-sso-toolkit.git
cd saml-sso-toolkit
```

> **Note:** This repository is automatically synced from an internal repository using force-push. If you encounter a "divergent branches" error when pulling, reset your local branch to match the remote:
> 
> ```bash
> git fetch origin
> git reset --hard origin/main
> ```
> 
> This will discard any local commits and match the remote exactly.

**Configure Backend & Frontend Port (Optional)**: By default the frontend application binds to port 8000, and the backend application binds to port 9000. However, if required, these ports can be changed to any other desired values. Update the port numbers in `sample-web-app/config.json` to new values for both frontend and backend, and restart the server to apply the updated ports.

### 2. Setup the Backend

```bash
cd sample-web-app/backend
npm install
```

> **Note**: If the above command triggers a security error. Please Bypass the security using the command here: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

```bash
# Build and start
npm run build
npm start
```

**Validation of server health (Optional)**: Validate the server health here - `http://localhost:9000/api/health`. If the backend port is modified, then open `http://localhost:{port}/api/health`

> **Note**: Default development certificates are included in `certs/` for convenience. For production use, generate your own keys (see Security Notice below).

For development with hot-reload: Use `npm run start:dev` instead of `npm run build && npm start`

### 3. Start the Frontend

Open a new terminal:

```bash
cd sample-web-app/frontend
npm install
npm start
```

> **Note** - If the above command triggers a security error. Please Bypass the security using the command here: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

### 4. Open the Toolkit

Navigate to `http://localhost:8000` (If not 8000 then `http://localhost:{port}`) in your browser.

## How It Works

### Configuration Page

When the toolkit loads, it displays:

- **ACS URL** input field - Enter your Test Assertion Consumer Service URL
- **Test encryption public certificate** field - Enter the Test public certificate in PEM format
- **User attributes** (first name, last name, member ID, and email) - non-editable mock data
- **Download Candescent Public Key** - For signature verification

### SAML Flow

1. Enter the test **ACS URL** and **encryption public certificate**
   - **Test ACS URL Example**: 
     - If running locally: `http://localhost:7080/api/saml-validator/acs`
     - If running in Docker: `http://host.docker.internal:7080/api/saml-validator/acs`
   - **Public Certificate**: Enter the test public certificate in PEM format

2. Click **Run Simulation** to generate and post the SAML assertion

3. Backend processes the request:
   - Creates a SAML assertion in XML format
   - Signs it using Candescent's private key
   - Encrypts it using the test public key
   - Base64-encodes the SAML response
   - Posts it to the test ACS URL

4. The system displays:
   - A **Success page** upon receiving a successful response from the ACS endpoint
   - An **Error page** with an appropriate error message when the ACS endpoint returns a failure response

### SAML Endpoints

The toolkit exposes standard SAML endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/saml/login` | POST | Generates and posts SAML assertion to ACS URL |
| `/api/saml/public-key` | GET | Returns Candescent's public key for signature verification |
| `/api/health` | GET | Health check |

## Validation

### Running the Validator

1. Navigate to `http://localhost:8000/samlValidator`
2. Click **Run Validator** to execute E2E tests
3. Review the validation report
4. Download reports if needed
5. Publish SAML settings after successful validation

The validator tests:
- SAML assertion generation
- Digital signing
- Assertion encryption
- ACS endpoint communication
- Response validation

### Validation Reports

After running the validator, download:
- **e2e-report.html** - Human-readable test report
- **jest-e2e.xml** - XML test report with test cases.

## Configuration

### Port Configuration

Edit `sample-web-app/config.json`:

```json
{
  "frontendPort": 8000,
  "backendPort": 9000
}
```

Values can be changed to any available ports on your system.

## Alternative Setup: Docker

For quick testing without installing Node.js, use the pre-built Docker image:

```bash
# Pull the image
docker pull ghcr.io/candescent-dev/saml-sso-toolkit:latest

# Run the container
docker run -p 9000:9000 -p 8000:8000 ghcr.io/candescent-dev/saml-sso-toolkit:latest
```

**Note for ARM64 users (Apple Silicon)**: The pre-built image is currently built for linux/amd64. If you encounter a "no matching manifest" error, use the `--platform` flag:

```bash
docker pull --platform linux/amd64 ghcr.io/candescent-dev/saml-sso-toolkit:latest
docker run --platform linux/amd64 -p 8000:8000 -p 9000:9000 ghcr.io/candescent-dev/saml-sso-toolkit:latest
```

Alternatively, build locally for your native platform (faster):

```bash
docker build -t saml-sso-toolkit:latest -f sample-web-app/Dockerfile sample-web-app
docker run -p 8000:8000 -p 9000:9000 saml-sso-toolkit:latest
```

Then open `http://localhost:8000` in your browser.

**Important**: When running the application in Docker and connecting to services on your host machine (like `client-web-app`), use `host.docker.internal` instead of `localhost` in ACS URLs. For example:
- Use: `http://host.docker.internal:7080/api/saml-validator/acs`
- Instead of: `http://localhost:7080/api/saml-validator/acs`

### Docker Port Configuration

If you want to use custom ports (e.g., change frontend from 8000 to 8080):

1. Update the config file - Edit `sample-web-app/config.json`:

```json
{
  "frontendPort": 8080,
  "backendPort": 9000
}
```

2. Mount the config file when running the container:

```bash
# Linux/macOS
docker run -p 9000:9000 -p 8080:8080 -v "$(pwd)/sample-web-app/config.json:/app/config.json" ghcr.io/candescent-dev/saml-sso-toolkit:latest

# Windows PowerShell
docker run -p 9000:9000 -p 8080:8080 -v "${PWD}\sample-web-app\config.json:/app/config.json" ghcr.io/candescent-dev/saml-sso-toolkit:latest

# Windows CMD
docker run -p 9000:9000 -p 8080:8080 -v "%CD%\sample-web-app\config.json:/app/config.json" ghcr.io/candescent-dev/saml-sso-toolkit:latest
```

**Note for Windows users**: If you encounter path resolution issues (e.g., "not a directory" or "mount" errors), ensure you're running the command from the project root directory where `sample-web-app/config.json` exists. If the issue persists, Docker Desktop may need the file path to be shared. You can use an absolute path as a workaround:

```powershell
# Windows PowerShell - Using absolute path (replace with your actual path)
docker run -p 9000:9000 -p 8080:8080 -v "C:/Users/YourUsername/path/to/saml-sso-toolkit/sample-web-app/config.json:/app/config.json" ghcr.io/candescent-dev/saml-sso-toolkit:latest
```

### Build Locally (Optional)

If you prefer to build the Docker image yourself:

```bash
git clone https://github.com/candescent-dev/saml-sso-toolkit.git
cd saml-sso-toolkit
docker build -t saml-sso-toolkit -f sample-web-app/Dockerfile sample-web-app
docker run -p 9000:9000 -p 8000:8000 saml-sso-toolkit
```

Building locally will automatically build for your native platform (ARM64 on Apple Silicon, AMD64 on Intel/AMD).

## Project Structure

```
saml-sso-toolkit/
├── sample-web-app/
│   ├── frontend/          # React UI for configuration
│   ├── backend/           # NestJS mock SAML Identity Provider
│   ├── test/              # Playwright E2E tests
│   └── config.json        # Port configuration
├── client-web-app/        # Mock vendor environment (testing only)
└── sample-web-app/Dockerfile  # Multi-stage build for Docker users
```

## Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React, Redux Toolkit | Configuration UI and flow initiator |
| Backend | NestJS | Mock SAML Identity Provider |
| client-web-app | NestJS | Mock vendor environment for testing |

### About the client-web-app

The `client-web-app` is a separate NestJS-based service that acts as a mock vendor environment for testing SAML SSO flows. It includes dummy ACS URL and test encryption public certificate to test the end-to-end flow.

> **Note for partners/FIs**: You typically don't need to run the client-web-app directly. Instead:
> - Use the sample-web-app as a mock IdP to test your own application
> - Run the E2E tests via Playwright if you want automated verification
> - The client-web-app can serve as reference code for implementing SAML client logic

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Port already in use | Another service running | Edit `config.json` to change ports |
| Backend won't start | Missing private key | Default keys should be in `certs/`. If missing, check certificate files |
| Frontend not connecting to backend | Backend not running | Ensure backend is started on the configured port |
| Token validation fails | Certificate mismatch | Re-download public key from the toolkit |
| Docker pull: "unauthorized" | Package visibility | The package must be public. Verify at https://github.com/orgs/candescent-dev/packages |
| Docker pull: "no matching manifest for linux/arm64" | Image built for AMD64 only | Use `--platform linux/amd64` flag or build locally (see Docker Setup) |

## Security Notice

### Default Development Certificates

This toolkit includes pre-generated RSA keys in `sample-web-app/backend/certs/` for convenience:

- ✅ Safe for local development and testing
- ❌ NOT secure for production use
- ❌ NOT secure for QA/staging environments

### For Production Use

If deploying to production or QA, generate your own keys using appropriate security practices.

## Development

### Running Tests

```bash
# Backend unit tests
cd sample-web-app/backend
npm test

# Backend E2E tests
npm run test:e2e

# Frontend E2E tests (requires Playwright)
cd sample-web-app
npx playwright test
```

## Tech Stack

- **Frontend**: React, Redux Toolkit, React Router
- **Backend**: NestJS, xml-crypto, xml-encryption, fast-xml-parser
- **Testing**: Jest, Supertest, Playwright

## Contributing

This repository is a **read-only mirror**. We do not accept pull requests. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for how to provide feedback.

## License

MIT License - see [LICENSE](LICENSE) for details.
