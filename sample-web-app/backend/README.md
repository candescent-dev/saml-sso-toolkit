# Overview

The backend generates a SAML assertion, signs it using Candescent’s private key, encrypts it using the vendor’s public key, base64-encodes the SAML response, and posts it to the vendor’s ACS URL.

## Compile and run the project

```bash
# install dependencies
$ npm install

# Start server
$ npm run start:dev

# production mode
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