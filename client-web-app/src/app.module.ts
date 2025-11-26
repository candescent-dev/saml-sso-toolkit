import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthValidatorModule } from './authValidator/authValidator.module';
import * as path from 'path';
import * as fs from 'fs';

export function loadAppConfig() {
  const configPath = path.resolve('../sample-web-app/config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('Config file not found: ' + configPath);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadAppConfig],
    }),
    AuthValidatorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
