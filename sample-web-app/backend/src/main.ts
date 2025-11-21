import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { APP_CONFIG } from './appConfig/appConfig.provider';

const FRONTEND_PUBLIC_CONFIG_PATH = '../../../frontend/public/api.config.json';
const FRONTEND_BUILD_CONFIG_PATH = '../../../frontend/api.config.json';

async function bootstrap() {
  // Create a new NestJS application instance
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get<{ backendPort: number }>(APP_CONFIG);
  const port = appConfig.backendPort;

  // Update frontend config both (local + build)
  const frontendConfig = {
    apiBaseURL: `http://localhost:${port}/api`,
  };
  const pathsToUpdate = [
    path.resolve(__dirname, FRONTEND_PUBLIC_CONFIG_PATH),
    path.resolve(__dirname, FRONTEND_BUILD_CONFIG_PATH),
  ];
  for (const filePath of pathsToUpdate) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(frontendConfig, null, 2));
      console.log(`Updated ${filePath} with baseURL: ${frontendConfig.apiBaseURL}`);
    } catch (err: any) {
      console.warn(`Could not update ${filePath}:`, err.message);
    }
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
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}`);
}
bootstrap();
