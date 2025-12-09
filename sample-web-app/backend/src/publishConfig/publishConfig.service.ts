import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const APP_CONFIG_PATH = '../../../../config.json';

@Injectable()
export class PublishConfigService {
  private readonly appConfigPath = path.resolve(__dirname, APP_CONFIG_PATH);

  /**
   * Reads and returns the SAML config.json file
   * @returns Buffer containing the contents of config.json
   * @throws NotFoundException if the config.json file is missing
   */
  getConfigFile(): Buffer {
    if (!fs.existsSync(this.appConfigPath)) {
      throw new NotFoundException(`Config file not found at: ${this.appConfigPath}`);
    }
    const fileBuffer = fs.readFileSync(this.appConfigPath);
    return fileBuffer;
  }
}
