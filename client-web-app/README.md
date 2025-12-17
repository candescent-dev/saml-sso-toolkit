## Client Web App Overview

This is a NestJS-based service used as a **mock application** to simulate a vendor’s environment for the SAML SSO features toolkit. It is intended **only for testing purposes** and **is not included in the final deliverable ZIP toolkit**.
  
It exposes REST APIs (under the `/api` prefix) that:
- Interact with the SAML toolkit backend to initiate and validate SAML SSO flows.
- Provide a simple integration surface for other applications to test and consume SAML SSO functionality.

This service listens on `http://localhost:7080` by default (see `src/main.ts`) and is intended to be used alongside the sample web application frontend and backend.

## How to Run `client-web-app`

### 1. Install dependencies

From the project root of `client-web-app`:

```bash
cd client-web-app
npm install
```

### 2. Start the server in development mode

```bash
npm run start:dev
```

This starts the NestJS server with hot-reload on `http://localhost:7080/api`.
