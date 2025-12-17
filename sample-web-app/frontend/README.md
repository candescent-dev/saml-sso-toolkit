# Getting Started with Create React App

The user opens the web application (for example, `http://localhost:8000`), where the frontend displays session-specific credentials along with mock user attributes.

The user enters the vendor’s **ACS URL** and **encryption public certificate**, which will be used to secure the SAML assertion. The user may also download the **Candescent public key** to enable the vendor to verify the SAML signature.

Clicking the **Run Simulation** button triggers the saml/login login API, which generates a SAML assertion that can be verified by the ACS endpoint.

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

# Start frontend
$ npm start

#Default port: 8000

Open frontend in browser: http://localhost:8000