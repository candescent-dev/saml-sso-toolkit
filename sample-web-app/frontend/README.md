# Getting Started with Create React App

The user opens the web application (for example, `http://localhost:8000`), where the frontend displays session-specific credentials along with mock user attributes.

The user enters the vendor’s **ACS URL** and **encryption public certificate**, which will be used to secure the SAML assertion. The user may also download the **Candescent public key** to enable the vendor to verify the SAML signature.

After clicking **Run Simulation**, the frontend sends the provided inputs to the backend Identity Provider (IdP) endpoint.

## Compile and run the project

```bash
# install dependencies
$ npm install

# Start frontend
$ npm start

#Default port: 8000

Open frontend in browser: http://localhost:8000