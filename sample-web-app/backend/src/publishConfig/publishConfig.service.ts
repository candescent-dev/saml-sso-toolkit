import { resolve } from 'path';
import type { Cache } from 'cache-manager';
import { existsSync, readFileSync } from 'fs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppConfig } from './types/publishConfig.types';
import { SamlSettingData } from '../saml/types/samlSetting.types';
import {
  Inject,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

const APP_CONFIG_PATH = '../../../../config.json';
const CACHE_JSON_PATH = '../../../../cache.json';

@Injectable()
export class PublishConfigService {
  private readonly appConfigPath = resolve(__dirname, APP_CONFIG_PATH);
  private readonly cacheJsonPath = resolve(__dirname, CACHE_JSON_PATH);
  private readonly SAML_SETTING_CACHE_KEY = 'saml_setting';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Retrieve cached saml setting, or undefined if expired.
   */
  async getSamlSettingFromCache(): Promise<SamlSettingData | undefined> {
    return await this.cacheManager.get<SamlSettingData>(this.SAML_SETTING_CACHE_KEY);
  }

  /**
   * Generic method to read and parse a JSON file
   * @template T The expected type of the JSON content
   * @param path - Full path to the JSON file
   * @param fileName - Friendly file name for error messages
   * @returns Parsed JSON object
   * @throws NotFoundException If the file does not exist
   * @throws InternalServerErrorException If the file cannot be read or parsed
   */
  private readJsonFile<T>(path: string, fileName: string): T {
    if (!existsSync(path)) {
      throw new NotFoundException(`${fileName} not found at: ${path}`);
    }
    try {
      const fileContent = readFileSync(path, 'utf8');
      return JSON.parse(fileContent) as T;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to read or parse ${fileName}`);
    }
  }

  /**
   * Retrieves the app configuration from config.json
   * @returns The parsed AppConfig object
   * @throws NotFoundException If config.json is missing
   * @throws InternalServerErrorException If config.json cannot be parsed or required fields are missing
   */
  getAppConfig(): AppConfig {
    const config = this.readJsonFile<AppConfig>(this.appConfigPath, 'config.json');
    if (!config.frontendPort) {
      throw new InternalServerErrorException('frontendPort is missing in config.json');
    }
    if (!config.backendPort) {
      throw new InternalServerErrorException('backendPort is missing in config.json');
    }
    return config;
  }

  /**
   * Retrieves the saml setting from cache.json
   * @returns SamlSettingData The parsed SamlSettingData object
   * @throws NotFoundException If cache.json is missing
   * @throws InternalServerErrorException If cache.json cannot be parsed or required fields are missing
   */
  getSamlSetting(): SamlSettingData {
    const samlSetting = this.readJsonFile<SamlSettingData>(this.cacheJsonPath, 'cache.json');
    if (!samlSetting.acsUrl) {
      throw new InternalServerErrorException('Missing acsUrl');
    }
    return samlSetting;
  }

  /**
   * Reads both config.json and cache.json, merges them, and returns the result as a Buffer
   * @returns The combined configuration as a JSON buffer
   * @throws NotFoundException If either config.json or cache.json is missing
   * @throws InternalServerErrorException If either file cannot be parsed or required fields are missing
   */
  async getConfigFile(): Promise<Buffer> {
    const appConfig = this.getAppConfig();
    const samlSetting = this.getSamlSetting();
    // Merge saml setting into app config
    appConfig.acsUrl = samlSetting.acsUrl;
    return Buffer.from(JSON.stringify(appConfig, null, 2));
  }
}
