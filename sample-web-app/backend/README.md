# Overview

The backend generates a SAML assertion, signs it using Candescent’s private key, encrypts it using the vendor’s public key, base64-encodes the SAML response, and posts it to the vendor’s ACS URL.

## Configuration

The sample web application includes a `config.json` file that allows you to configure the frontend and backend ports.

**Location:**  
`sample-web-app/config.json`

**Example:**
{
  "frontendPort": 8000,
  "backendPort": 9000
}

### Port descriptions:

- **frontendPort**: Port on which the sample frontend application runs
- **backendPort**: Port on which the backend server runs

Update these values as needed before starting the application.

## Compile and run the project

```bash
# install dependencies
$ npm install

# Start server in development mode
$ npm run start:dev

# Start server in production mode
$ npm run start:prod

#Default port: 9000

#Verify server health
Open backend in browser: http://localhost:9000/api/health

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```