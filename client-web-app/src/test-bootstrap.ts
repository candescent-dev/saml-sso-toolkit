import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function startClientTestServer(port = 7000) {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(port);
  console.log(`Client test server running on port ${port}`);
    console.log(`Server listening on http://localhost:${port}`);
  return app;
}