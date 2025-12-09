import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Provider } from '@nestjs/common';

export const APP_CONFIG = 'APP_CONFIG';
const APP_CONFIG_PATH = resolve(__dirname, '../../../../config.json');

export const AppConfigProvider: Provider = {
  provide: APP_CONFIG,
  useFactory: () => {
    let appConfig = { frontendPort: 8000, backendPort: 9000 }; // default
    try {
      const json = JSON.parse(readFileSync(APP_CONFIG_PATH, 'utf-8'));
      appConfig = { ...appConfig, ...json };
    } catch {
      console.warn(
        `config.json not found at: ${APP_CONFIG_PATH}. Falling back to default port ${appConfig.backendPort}`,
      );
    }
    return appConfig;
  },
};