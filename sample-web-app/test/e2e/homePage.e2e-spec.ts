
// Playwright test runner + assertions
import { test, expect, request } from '@playwright/test';

// POM + global URLs (exported from POM)
import { HomePage, backendUrl, frontendURL, healthURL, validACSUrl, validCertificate } from './pages/homePage';

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
});

// -------------------------------------------------------
// TC-002: Validate homepage elements and helper texts (UI)
// -------------------------------------------------------
test('TC-002: Validate homepage elements and helper texts', async ({ page }) => {
  // Initialize the POM with the current Playwright Page instance
  const home = new HomePage(page);

  // Navigate to the app (defaults to frontendURL if none provided)
  await home.goto(frontendURL);

  // ---------- Helper text validations ----------
  await expect(home.textACSUrl).toBeVisible();
  await expect(home.textACSUrlLbl).toHaveText('Vendors can expect to receive the SAML response here.');

  await expect(home.publicKey).toBeVisible();
  await expect(home.publicKeyLbl).toHaveText(
    'Public certificate required to encrypt the SAML assertion before it is sent to the Test ACS URL.'
  );

  // ---------- Vendor info inputs ----------
  await expect(home.firstName).toBeVisible();
  await expect(home.lastName).toBeVisible();
  await expect(home.memberId).toBeVisible();
  await expect(home.email).toBeVisible();

  // ---------- Action buttons ----------
  await expect(home.runSimulationBtn).toBeVisible();
  await expect(home.publicKeyDwdBtn).toBeVisible();
});
test('TC-003: Run Simulation button should remain disabled for invalid ACS URL and certificate', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.textACSUrl.fill('invalid-url'); // invalid URL
  await home.publicKey.fill('TestinvalidCertificate'); // invalid certificate
  const runBtn = home.runSimulationBtn;
  await expect(runBtn).toBeDisabled();
});




