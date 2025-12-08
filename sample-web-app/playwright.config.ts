import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 360000, // For long-running tests like token expiry
  fullyParallel: false, // Ensure sequential execution
  testDir: './test/e2e',
  testMatch: ["/**/*.e2e-spec.ts"],
  // Completely ignore backend and frontend source code
  testIgnore: [
    '**/backend/**',
    '**/frontend/**',
    '**/frontend/node_modules/**',
    '**/backend/node_modules/**',
    '**/*.spec.ts'            // ignore Jest/Nest unit tests
  ],
  webServer: [
    {
      command: 'npm run start --prefix ./backend',
      port: 9000,
      timeout: 200000,
      reuseExistingServer: true
    },
    {
      command: 'npm run start --prefix ./frontend',
      port: 8000,
      timeout: 180000,
      reuseExistingServer: true
    }
  ],
  use: {
    baseURL: 'http://localhost:8000',
    acceptDownloads: true,
    headless: true,
    permissions: ["clipboard-read", "clipboard-write"],
    launchOptions: {
    args: ["--disable-features=IsolateOrigins,site-per-process"],
  }
  },
  tsconfig: "./playwright.tsconfig.json",
});