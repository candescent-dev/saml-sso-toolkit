
// Playwright test runner + assertions
import { test, expect, request } from '@playwright/test';

// POM + global URLs (exported from POM)
import { HomePage, backendUrl, frontendURL, healthURL } from './pages/homePage';
import { SimulatorPage } from './pages/simulatorPage';

// -------------------------------
// TC-001: Backend health endpoint
// -------------------------------
test('TC-001: backend should return status 200 for /api/health', async () => {
  // Use a dedicated APIRequestContext to avoid polluting the UI Page context
  const api = await request.newContext();

  const url = `${backendUrl}${healthURL}`;
  console.log(`[INFO] Health check URL: ${url}`);

  const response = await api.get(url);

  // HTTP status must be OK
  expect(response.status()).toBe(200);

  // Payload should contain { status: 'ok' }
  const json = await response.json();
  expect(json).toHaveProperty('status', 'ok');

  // Dispose the API context (good hygiene)
  await api.dispose();

test('TC-002: Validate homepage elements and helper texts', async ({ page }) => {
  // ---------- Helper text validations ----------
  await expect(simulator.textACSUrl).toBeVisible();
});