
# Simple-web-app
Simple-web-app is a lightweight web application consisting of two  modules:
1. frontend
2. backend

### Getting Started 

#### Prerequisites
Make sure to install the following applications:
1. Node.js
2. npm
3. Docker

To run the application, follow below steps:
1. #### Create Docker Image
    Navigate to the sample-web-app directory and execute:
    **`docker build -t saml-sso-toolkit:latest .`**

    *This builds the Docker image for the application.*
2. #### Run the Application
    Once the image is successfully created, start the container by running:
    **`docker run -d --name saml-sso-toolkit -p 8000:8000 -p 9000:9000 saml-sso-toolkit:latest`**

    *This will launch the web application (frontend and backend) using the previously built Docker image.*

    ```
    Default Ports:
    - frontend: 8000
    - backend : 9000
    ```

3. #### Health Check
    To verify that the application is running correctly, check:
    - Frontend: `http://localhost:8000`
    - Backend health: `http://localhost:9000/api/health`
