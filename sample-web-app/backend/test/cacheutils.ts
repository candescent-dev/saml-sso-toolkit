import * as fs from 'fs';
import * as path from 'path';

const APP_CONFIG_PATH = '../../cache.json';

export interface AppConfig {
  acsUrl?: string;
  updatedAt?: string;
}

/**
 * Safely read JSON config and return acsUrl.
 * Throws a clear error if file/path/JSON/key is missing.
 */
export function readAcsUrl(): string {
  // Resolve relative to this file, not the working directory
  const resolvedPath = path.resolve(__dirname, APP_CONFIG_PATH);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Config file not found at: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  let json: AppConfig;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in ${resolvedPath}: ${(e as Error).message}`);
  }

  if (!json.acsUrl || typeof json.acsUrl !== 'string') {
    throw new Error(
      `Missing or invalid "acsUrl" in config: ${resolvedPath}`
    );
  }

  return json.acsUrl;
}