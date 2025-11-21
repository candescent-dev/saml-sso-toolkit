import * as fs from 'fs';
import * as path from 'path';
import { Provider } from '@nestjs/common';

export const APP_CONFIG = 'APP_CONFIG';
const APP_CONFIG_PATH = '../../../../config.json';

export const AppConfigProvider: Provider = {
  provide: APP_CONFIG,
  useFactory: () => {
    const appConfigPath = path.resolve(__dirname, APP_CONFIG_PATH);
    let appConfig = { backendPort: 9000 }; // default
    try {
      const rawData = fs.readFileSync(appConfigPath, 'utf-8');
      const json = JSON.parse(rawData);
      appConfig.backendPort = json.backendPort ?? appConfig.backendPort;
    } catch (err) {
      console.warn(
        `config.json not found at: ${appConfigPath}. Falling back to default port ${appConfig.backendPort}`,
      );
    }
    return appConfig;
  },
};
