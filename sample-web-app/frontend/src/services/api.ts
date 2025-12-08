import axios, { AxiosInstance } from 'axios';

export interface ApiConfig {
  apiBaseURL: string;
}

// Default config (used if api.config.json is missing)
let apiConfig: ApiConfig = {
  apiBaseURL: 'http://localhost:9000/api',
};

let api: AxiosInstance | null = null;
let configLoaded = false;

/**
 * Initialize API: load config.json and create Axios instance
 */
export async function initializeApi(): Promise<void> {
  if (configLoaded) return;
  try {
    const res = await fetch('/api.config.json', { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      apiConfig.apiBaseURL = data.apiBaseURL || apiConfig.apiBaseURL;
      console.log('Loaded API config:', apiConfig);
    } else {
      console.warn('api.config.json not found, using default API base URL');
    }
  } catch (error) {
    console.warn('Error loading api.config.json, using default API base URL', error);
  }
  api = axios.create({
    baseURL: apiConfig.apiBaseURL,
    withCredentials: true,
  });
  configLoaded = true;
}

/**
 * Get Axios instance (after initialization)
 */
export function getApi(): AxiosInstance {
  if (!api) {
    throw new Error('API not initialized. Call initializeApi() before calling getApi().');
  }
  return api;
}
