
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

test('TC-004: Valid URL + Invalid certificate keeps button disabled', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto(frontendURL);

  await home.textACSUrl.fill(validACSUrl);
  await home.publicKey.fill("invalid-cert");

  // Run Simulation must stay disabled
  await expect(home.ErrorPublicKey).toBeVisible();
  await expect(home.runSimulationBtn).toBeDisabled();
});

test('TC-005: Invalid URL + valid certificate keeps button disabled', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto(frontendURL);

  await home.textACSUrl.fill("invalid url");
  await home.publicKey.fill(validCertificate);

  // Run Simulation must stay disabled
  await expect(home.ErrorACSUrl).toBeVisible();
  await expect(home.runSimulationBtn).toBeDisabled();
});

test('TC-006: Run Simulation disabled when ACS URL is empty', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto(frontendURL);

  // Leave ACS URL empty
  await home.textACSUrl.fill(" ");
  await home.publicKey.fill(validCertificate);

  // Run Simulation must stay disabled
  await expect(home.runSimulationBtn).toBeDisabled();
});

test('TC-007: Run Simulation disabled when Public certificate is empty', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto(frontendURL);

  await home.textACSUrl.fill(validACSUrl);

  // Leave certificate empty
  await home.publicKey.fill(" ");

  // Run Simulation must stay disabled
  await expect(home.runSimulationBtn).toBeDisabled();
});

test('TC-008: Run Simulation disabled when both ACS Url and Public certificate is empty', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto(frontendURL);

  // Leave ACS URL empty
  await home.textACSUrl.fill(" ");

  // Leave certificate empty
  await home.publicKey.fill(" ");

  // Run Simulation must stay disabled
  await expect(home.runSimulationBtn).toBeDisabled();
});

test('TC-009: Invalid certificate should show validation error', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto(frontendURL);


  await home.publicKey.fill("Test invalid input "); // invalid content
  await expect(home.ErrorPublicKey).toBeVisible();
});

test('TC-010: Invalid ACS URL should show validation error', async ({ page }) => {
  const home = new HomePage(page);
  await home.goto(frontendURL);

  await home.textACSUrl.fill("Test invalid input "); // invalid content
  await expect(home.ErrorACSUrl).toBeVisible();
});


test('Run Simulation button works with valid ACS + certificate', async ({ page }) => {
  const home = new HomePage(page);

  console.log('➡ Opening Home Page');
  await home.goto();

  console.log('➡ Filling ACS URL + Certificate');
  await home.textACSUrl.fill(validACSUrl);
  await home.publicKey.fill(validCertificate);

  console.log('➡ Clicking Run Simulation button');
  await expect(home.runSimulationBtn).toBeEnabled();
  await home.runSimulationBtn.click();

  console.log('✅ Click action successful — no errors thrown');
});

test('Download Candescent Public Key works and file is .pem', async ({ page }) => {
  const home = new HomePage(page);

  console.log('➡ Opening Home Page');
  await home.goto();

  console.log('Waiting for file download');
  const downloadPromise = page.waitForEvent('download');

  console.log('➡ Clicking Candescent Public Key download button');
  await home.publicKeyDwdBtn.click();

  const download = await downloadPromise;
  const fileName = download.suggestedFilename();

  console.log('➡ Downloaded file:', fileName);

  // Assert file exists
  expect(fileName).not.toBeNull();

  // Assert file is in .pem format
  expect(fileName.toLowerCase()).toContain('.pem');

  console.log('✅ Download test passed — .pem file downloaded successfully');
});