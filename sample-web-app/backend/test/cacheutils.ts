import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const LOCAL_CACHE_JSON_RELATIVE_PATH = '../cache.json';
const ZIP_CACHE_JSON_RELATIVE_PATH = '../../cache.json';

export interface AppConfig {
  acsUrl: string;
  publicCertificate?: string;
  updatedAt: string;
}

export interface samlConfig {
  acsUrl: string;
  publicCertificate?: string;
}

/**
 * Reads acsUrl & publicCertificate from a given cache.json file
 * and validates its structure
 */
function loadSamlConfig(configFilePath: string): samlConfig {
  let config: AppConfig;
  try {
    const rawContent = readFileSync(configFilePath, 'utf-8');
    config = JSON.parse(rawContent);
  } catch (error) {
    throw new Error(
      `Failed to read or parse config file at ${configFilePath}: ${(error as Error).message}`,
    );
  }
  if (typeof config.acsUrl !== 'string') {
    throw new Error(`"acsUrl" is missing or invalid in ${configFilePath}`);
  }
  if (typeof config.publicCertificate !== 'string') {
    throw new Error(`"publicCertificate" is missing or invalid in ${configFilePath}`);
  }
  return {
    acsUrl: config.acsUrl,
    publicCertificate: config.publicCertificate,
  };
}

/**
 * Resolves acsUrl across different runtime layouts - local / build layout
 * - packaged ZIP (final deliverable) layout
 */
export function readSamlConfig(): samlConfig {
  const loaclCacheJsonPath = resolve(__dirname, LOCAL_CACHE_JSON_RELATIVE_PATH);
  const zipCacheJsonPath = resolve(__dirname, ZIP_CACHE_JSON_RELATIVE_PATH);
  if (existsSync(loaclCacheJsonPath)) {
    return loadSamlConfig(loaclCacheJsonPath);
  }
  if (existsSync(zipCacheJsonPath)) {
    return loadSamlConfig(zipCacheJsonPath);
  }
  throw new Error(
    `cache.json not found in expected locations:\n` +
      `- ${loaclCacheJsonPath}\n` +
      `- ${zipCacheJsonPath}`,
  );
}
