# SAML SSO Toolkit

A comprehensive SAML SSO Toolkit Simulator to test and validate the complete SAML Single Sign-On (SSO) flow, compatible with the Candescent production platform, in a local development environment. This toolkit acts as a simulator by replicating the key functionalities of SAML, such as generating SAML assertions. It allows developers to verify, during development, that their application's SAML integration works as expected and is fully compatible with the Candescent production platform.

## Overview

This toolkit provides a complete SAML SSO testing environment with:

- **Frontend**: React-based web application for configuring and running SAML simulations
- **Backend**: NestJS service that generates, signs, and encrypts SAML assertions
- **Client Web App**: Mock application to simulate vendor environments for testing
- **Validator**: Comprehensive validation tool to test SAML configurations

## Components

### Frontend (`sample-web-app/frontend`)
- Displays a homepage containing the Test ACS URL field, Test encryption public certificate field, and mock user attributes (first name, last name, member ID, and email)
- Provides an option to download the Candescent public key
- Includes a **Run Simulation** button that triggers the `saml/login` API, which generates a SAML assertion that can be verified by the ACS endpoint
- Displays a Success page when a successful response is received from the ACS endpoint
- Displays an Error page with an appropriate error message when the ACS endpoint returns a failure response
- **SAML Validator** page for validating and publishing SAML configuration settings

### Backend (`sample-web-app/backend`)
- Creates SAML assertion in XML format
- Signs assertions using Candescent's private key
- Encrypts the SAML assertion based on the vendor's test public certificate
- Base64-encodes the SAML response and posts it to the vendor's ACS URL
- Provides E2E testing endpoints for validation

### client-web-app (`client-web-app`)
The `client-web-app` is a separate NestJS-based service that acts as the client-facing entry point for SAML SSO feature validation. It includes dummy ACS URL and test encrypted public certificate to test the end to end flow.

**Note**: This service is intended **only for testing purposes**.

## Technologies Used

### Frontend (`sample-web-app/frontend`)
- **Framework**: React (Create React App)
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Routing**: React Router (`react-router-dom`)
- **Styling**: CSS modules and standard CSS
- **Testing**: Playwright

### Backend (`sample-web-app/backend`)
- **Framework**: NestJS (Node.js)
- **Build & Runtime**: Node.js + npm
- **Validation & Transformation**: `class-validator`, `class-transformer`
- **Security / SAML**: `xml-crypto`, `xml-encryption`, `fast-xml-parser` for SAML assertion handling
- **Testing**: Jest, Supertest

### client-web-app (`client-web-app`)
- **Framework**: NestJS (Node.js)
- **HTTP / Integration**: `@nestjs/axios` and `rxjs` for calling external SAML toolkit endpoints
- **Validation & Transformation**: `class-validator`, `class-transformer`
- **Security / SAML Handling**: `xml-crypto`, `xpath` for working with SAML responses

## Prerequisites

- **Node.js**: Install a recent LTS version (v18 or higher recommended)
- **npm**: Comes bundled with Node.js
- **Docker** (optional): For containerized deployment

## Clone the Project

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

## Configuration

The sample web application includes a `config.json` file that allows you to configure the frontend and backend ports.

**Location:**  
`sample-web-app/config.json`

**Example:**
```json
{
  "frontendPort": 8000,
  "backendPort": 9000
}
```

### Port descriptions:

- **frontendPort**: Port on which the sample frontend application runs (default: 8000). The frontend will automatically use this port when you run `npm start`. Change this value to use a different port dynamically.
- **backendPort**: Port on which the backend server runs (default: 9000)

**Important**: If you change the `frontendPort` in `config.json`, the frontend will automatically use the new port on the next start. No additional configuration is needed, and no errors will be shown.

## Running the Sample Web App (Backend + Frontend)

The sample application contains both the backend (NestJS) and frontend (React).

### Start the Backend Server

Open a terminal and run:

```bash
cd sample-web-app/backend
npm install
npm run start:dev
```

This starts the NestJS backend server in watch mode. The default port is `http://localhost:9000` (unless configured otherwise in `config.json`).

**Verify backend health:**
```bash
curl http://localhost:9000/api/health
```

### Start the Frontend Server

Open a new terminal window and run:

```bash
cd sample-web-app/frontend
npm install
npm start
```

The frontend React app will automatically read the port from `sample-web-app/config.json` and start on the configured port. By default, it uses port 8000 (`http://localhost:8000`).

**Note**: The start script automatically reads the `frontendPort` from `config.json`. If you change the port in `config.json`, the frontend will dynamically use the new port on the next start without any errors.

**Alternative**: You can also use specific port commands:
- `npm run start:8000` - Start on port 8000
- `npm run start:8080` - Start on port 8080
- `npm run start:9000` - Start on port 9000

Once both servers are running:
- Access the **frontend** in your browser at `http://localhost:8000`.
- Provide the `ACS URL` and `Test encryption public certficate` in the required fields. 
- The frontend will communicate with the **backend** to generate SAML assertions, sign them with Candescent's private key, encrypt them using the vendor's public key, Base64-encode the resulting SAML response, and post it to the vendor's ACS URL

**Important**: When entering the ACS URL in the frontend, use the complete endpoint path. 
For example:
- If you are using our client-web-app: `http://localhost:7080/api/saml-validator/acs`

**Note for Docker Users**: If you're running the sample web app in a Docker container and need to connect to services running on your host machine (like `client-web-app`), replace `localhost` with `host.docker.internal` in the ACS URL:
- **When running in Docker**: Use `http://host.docker.internal:7080/api/saml-validator/acs` instead of `http://localhost:7080/api/saml-validator/acs`
- This is because `localhost` inside a Docker container refers to the container itself, not your host machine
- `host.docker.internal` is a special DNS name that resolves to the host machine's IP address

## Running the Client Web App (Optional - for testing)

The `client-web-app` is a mock application that simulates a vendor's environment. It's useful for end-to-end testing.

```bash
cd client-web-app
npm install
npm run start:dev
```

This starts the client web app on `http://localhost:7080/api` by default.

## Application Flow

1. User opens the web application (e.g., `http://localhost:8000`)

2. The homepage displays:
   - ACS URL input field
   - Vendor's public certificate input field
   - User attributes (first name, last name, member ID, and email) - non-editable
   - Option to download the **Candescent Public Key** for signature verification

3. User enters the vendor's **ACS URL** and **encryption public certificate**
   - **ACS URL Example**: 
     - If running locally: `http://localhost:7080/api/saml-validator/acs`
     - If running in Docker: `http://host.docker.internal:7080/api/saml-validator/acs`
   - **Public Certificate**: Enter the vendor's public certificate in PEM format

4. User clicks **Run Simulation** button that triggers the `saml/login` API, which generates a SAML assertion that can be verified by the ACS endpoint

5. Backend processes the request:
   - Creates a SAML assertion in XML format
   - Signs it using Candescent's private key
   - Encrypts it using the vendor's public key
   - Base64-encodes the SAML response
   - Posts it to the vendor's ACS URL

6. The system displays:
   - A **Success page** upon receiving a successful response from the ACS endpoint
   - An **Error page** with an appropriate error message when the ACS endpoint returns a failure response

## SAML Validator

The toolkit includes a comprehensive SAML Validator page accessible at `/samlValidator` that allows you to:

- Run E2E validation tests
- View validation reports (HTML and XML)
- Download validation reports
- Publish SAML configuration settings

To access the validator:
1. Navigate to `http://localhost:8000/samlValidator`
2. Click **Run Validator** to start validation
3. Review the validation report
4. Download reports if needed
5. Publish SAML settings after successful validation

## Project Structure

```
saml-sso-toolkit/
├── .github/
│   └── workflows/
│       ├── ci-cd.yaml
│       └── release.yaml
├── client-web-app/
│   ├── certs/
│   ├── src/
│   │   ├── samlValidator/
│   │   └── ...
│   ├── test/
│   ├── package.json
│   └── README.md
├── documentation/
│   └── SAML Toolkit - User Guide-v1.0.docx
├── sample-web-app/
│   ├── backend/
│   │   ├── certs/
│   │   ├── src/
│   │   │   ├── saml/
│   │   │   ├── e2eTest/
│   │   │   ├── publishConfig/
│   │   │   └── ...
│   │   ├── test/
│   │   ├── package.json
│   │   └── README.md
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Home/
│   │   │   │   ├── SamlValidator/
│   │   │   │   ├── Success/
│   │   │   │   └── Error/
│   │   │   └── ...
│   │   ├── public/
│   │   ├── package.json
│   │   └── README.md
│   ├── test/
│   │   └── e2e/
│   ├── config.json
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── scripts/
│   ├── local-build.sh
│   ├── local-build.ps1
│   ├── shell/
│   │   ├── init.sh
│   │   ├── run-web-app.sh
│   │   └── selftest.sh
│   ├── ps/
│   │   ├── init.ps1
│   │   ├── run-web-app.ps1
│   │   └── selftest.ps1
│   └── README.md
└── README.md
```

## Directory Descriptions

### `.github/`
Contains CI/CD pipeline configurations and GitHub Actions workflows. This automates testing, building, and deployment processes.

### `client-web-app/`
The client-facing web application. It serves as a mock vendor environment for testing SAML SSO flows. **Note**: This is for testing purposes only and is not included in the final deliverable.

### `documentation/`
Contains user guides and documentation for the SAML toolkit.

### `sample-web-app/`
A complete web application that includes both frontend and backend modules. This serves as a reference implementation for the overall system.

#### `sample-web-app/backend/`
NestJS backend service that handles SAML assertion generation, signing, and encryption.

#### `sample-web-app/frontend/`
React frontend application for configuring and running SAML simulations.

#### `sample-web-app/config.json`
Configuration file for frontend and backend ports.

#### `sample-web-app/Dockerfile`
Docker configuration for containerized deployment.

### `scripts/`
Utility scripts to:
- Local Build in order to generate ZIP archive
- Create Docker images
- Containerize the application
- Run health checks on the deployed system

These scripts streamline local development and deployment workflows.

## Running Tests

### Backend Tests

```bash
cd sample-web-app/backend

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend E2E Tests

```bash
cd sample-web-app

# Install Playwright browsers (first time only)
npm run playwright:install

# Run E2E tests
npm run test:e2e
```

## Building and Packaging

### Local Build

To build the project and create a distributable ZIP package:

**Linux/macOS:**
```bash
./scripts/local-build.sh
```

**Windows PowerShell:**
```powershell
.\scripts\local-build.ps1
```

This will:
- Build the frontend and backend
- Run tests
- Create a ZIP archive in the `dist/` folder: `saml-sso-toolkit.zip`

### Docker Build

To build and run using Docker:

**Important**: When running the application in Docker and connecting to services on your host machine (like `client-web-app`), use `host.docker.internal` instead of `localhost` in ACS URLs. For example:
- Use: `http://host.docker.internal:7080/api/saml-validator/acs`
- Instead of: `http://localhost:7080/api/saml-validator/acs`

**Linux/macOS:**
```bash
cd scripts/shell
./init.sh          # Build Docker image
./run-web-app.sh   # Run the application
./selftest.sh      # Verify it's working
```

**Windows PowerShell:**
```powershell
cd scripts\ps
.\init.ps1          # Build Docker image
.\run-web-app.ps1   # Run the application
.\selftest.ps1      # Verify it's working
```

## Deployment

The toolkit can be deployed using:

1. **Docker**: Use the provided Dockerfile and scripts
2. **ZIP Archive**: Extract the generated ZIP and follow the included instructions
3. **Manual**: Follow the "Running the Sample Web App" section above

## CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Continuous Integration (CI): Runs on push and pull requests
- Continuous Deployment (CD): Runs on main branch
- Release: Creates and uploads artifacts to Artifactory

## Troubleshooting

### Port Already in Use
If you encounter port conflicts, update the ports in `sample-web-app/config.json`.

### Backend Not Starting
- Verify Node.js version (v18+ recommended)
- Check that port 9000 (or configured port) is available
- Review backend logs for errors

### Frontend Not Connecting to Backend
- Ensure backend is running
- Verify the backend URL in frontend configuration
- Check CORS settings if needed

### Certificate Issues
- Ensure certificates are in the correct format (PEM)
- Verify certificate paths in the code
- Check that private and public keys match

## Support

For issues, questions, or contributions, please refer to the project documentation or contact the development team.

## Contributing

This repository is a **read-only mirror**. We do not accept pull requests. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for how to provide feedback.

## License

MIT License - see [LICENSE](LICENSE) for details.

