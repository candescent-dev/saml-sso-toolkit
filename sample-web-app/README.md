
# Simple-web-app
Simple-web-app is a lightweight web application consisting of two  modules:
1. frontend
2. backend

### Getting Started 

#### To Create Zip in local
./script/local-build.sh

#### Prerequisites
Make sure to install the following applications:
1. Node.js
2. npm
3. Docker

To run the application, follow below steps:
1. #### Create Docker Image
    Navigate to the script directory and execute:
    **`./init.sh`**

    *This script builds the Docker image for the application.*
2. #### Run the Application
    Once the image is successfully created, start the container by running:
    **`./run-web-app.sh`**

    *This will launch the web application (frontend and backend) using the previously built Docker image.*

    ```
    Default Ports:
    - frontend: 8000
    - backend : 9000
    ```

3. #### Health Check
    To verify that the application is running correctly, use:
    **`./selftest.sh`**
    *This script performs a basic health check on the application.*
