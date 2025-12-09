import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { APP_CONFIG } from './appConfig/appConfig.provider';

const FRONTEND_PACKAGE_JSON_PATH = '../../../frontend/package.json';
const FRONTEND_DOCKER_CONFIG_PATH = '../../../frontend/api.config.json';  // Docker
const FRONTEND_BUILD_CONFIG_PATH = '../../../frontend/build/api.config.json';  // Native Build (Zip File)
const FRONTEND_PUBLIC_CONFIG_PATH = '../../../frontend/public/api.config.json'; // Local

async function bootstrap() {
  // Create a new NestJS application instance
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get<{ backendPort: number; frontendPort: number }>(APP_CONFIG);
  const { backendPort, frontendPort } = appConfig;

  const apiBaseURL = `http://localhost:${backendPort}/api`;

  // Update frontend config both (local + build)
  [FRONTEND_PUBLIC_CONFIG_PATH, FRONTEND_DOCKER_CONFIG_PATH, FRONTEND_BUILD_CONFIG_PATH].forEach(
    (path) => {
      const filePath = resolve(__dirname, path);
      try {
        writeFileSync(filePath, JSON.stringify({ apiBaseURL }, null, 2));
        console.log(`Updated ${filePath} with apiBaseURL: ${apiBaseURL}`);
      } catch (err: any) {
        console.warn(`Could not update ${filePath}:`, err.message);
      }
    },
  );

  // Update package.json start script
  try {
    const packageJsonPath = resolve(__dirname, FRONTEND_PACKAGE_JSON_PATH);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    packageJson.scripts = {
      ...packageJson.scripts,
      start: `PORT=${frontendPort} react-scripts start`,
    };
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2).trimEnd());
    console.log(`Updated package.json start script with PORT=${frontendPort}`);
  } catch (err: any) {
    console.warn('Could not update package.json:', err.message);
  }

  // Enable custom CORS options
  app.enableCors({
    origin: true, // allow all origins dynamically
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // allowed HTTP methods
    credentials: true, // allow cookies to be sent
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api'); // makes all routes start with /api

  // Enable global validation for incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not defined in DTOs
      forbidNonWhitelisted: true, // throw error if unknown properties are sent
    }),
  );

  // Start the application on dynamic port (default port - 9000)
  await app.listen(backendPort);
  console.log(`Server listening on http://localhost:${backendPort}`);
}
bootstrap();