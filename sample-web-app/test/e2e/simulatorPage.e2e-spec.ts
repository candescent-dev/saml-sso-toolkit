
// Playwright test runner + assertions
import { test, expect, request } from '@playwright/test';

// POM + global URLs (exported from POM)
import { HomePage, backendUrl, frontendURL, healthURL, validACSUrl, validCertificate } from './pages/homePage';
import { SimulatorPage } from './pages/simulatorPage';
import { ErrorPage } from './pages/errorPage';

const ACSUrl = 'http://localhost:7000/api/saml-validator/acs';

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
test('TC-001.1: client web server should return status 200 for /api/health', async () => {
  // Use a dedicated APIRequestContext to avoid polluting the UI Page context
  const api = await request.newContext();

  const url = `http://localhost:7000/health`;
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

test('TC-002: Valid certificate but unreachable ACS URL should redirect to 502 Error Page', async ({ page }) => {

  const home = new HomePage(page);
  const errorPage = new ErrorPage(page);

  await home.goto();

  // Valid format but wrong server (google.com)
  const wrongValidFormatURL = 'http://nonexistent-test-domain-xyz-123.com/acs';
  await home.textACSUrl.fill(wrongValidFormatURL);

  await home.publicKey.fill(validCertificate);

  // Button must be enabled
  await expect(home.runSimulationBtn).toBeEnabled();

  await home.runSimulationBtn.click();

  // User should navigate to the error page
  await expect(errorPage.title).toBeVisible();

  await expect(errorPage.errorCode).toHaveValue('502');
  await expect(errorPage.errorReason).toContainText('ENOTFOUND');
  await expect(errorPage.retryBtn).toBeVisible();
  await expect(errorPage.backHome).toBeVisible();
});

test('TC-003: Valid ACS URL with invalid certificate should show 422 Parsing Error Page', async ({ page }) => {
  const home = new HomePage(page);
  const errorPage = new ErrorPage(page);

  await home.goto();

  await home.textACSUrl.fill(validACSUrl);

  // Invalid certificate: missing PEM headers intentionally to simulate parse failure
  const invalidCertificate = `-----BEGIN CERTIFICATE-----\nMIIDqDCCApACCQDgP4andCbAmO2Fu1gdTJrQ
  DPUYR4PfRFgx21hznvbGq\nbQWIuQDwgWcnppYvbA/BzUiXXg8Mg3xg4X9oGQ==\n-----END CERTIFICATE-----`;

  await home.publicKey.fill(invalidCertificate);

  // Button must be enabled (assuming URL and cert format are valid enough)
  await expect(home.runSimulationBtn).toBeEnabled();

  await home.runSimulationBtn.click();

  // User should navigate to the error page
  await expect(errorPage.title).toBeVisible();

  // Error code should be 422 for parsing failure
  await expect(errorPage.errorCode).toHaveValue('422');

  // Error reason should mention parsing failure
  await expect(errorPage.errorReason).toContainText('Certificate parsing failed');

  // Buttons must be visible on error page
  await expect(errorPage.retryBtn).toBeVisible();
  await expect(errorPage.backHome).toBeVisible();
});

test('TC-004: User should return to Homepage when selecting Back to Home on Error Page', async ({ page }) => {
  const home = new HomePage(page);
  const errorPage = new ErrorPage(page);

  await home.goto();

  // Trigger an error by entering a non-existent ACS URL with a valid cert
  await home.textACSUrl.fill('http://invalid-domain-xyz.com/acs');
  await home.publicKey.fill(validCertificate);

  await expect(home.runSimulationBtn).toBeEnabled();
  await home.runSimulationBtn.click();

  // User should reach the error page
  await expect(errorPage.title).toBeVisible();

  // Click "Back to Home Page"
  await errorPage.backHome.click();

  // User should be returned to the homepage
  await expect(home.textACSUrl).toBeVisible();
  await expect(page).toHaveURL(frontendURL);
});

// -------------------------------------------------------
// TC-005: Validate Simulation Successful message on simulator page
// -------------------------------------------------------
test('TC-005: Validate Simulation Successful message on simulator page', async ({ page }) => {
  // Initialize the POM with the current Playwright Page instance
  const home = new HomePage(page);
  const simulator = new SimulatorPage(page);
  // Navigate to the app (defaults to frontendURL if none provided)
  await home.goto(frontendURL);

  // ---------- Verify Homepage successfully visible ----------
  await expect(home.textACSUrl).toBeVisible();
  await expect(home.publicKey).toBeVisible();
 
  // ---------Run Simulation with valid data ----------
  await home.runSimulation(ACSUrl,validCertificate)
await page.waitForTimeout(3000);
  await expect(simulator.lblACSUrl).toBeVisible();

  //-------Successful Simulation Text verification-----
  await expect(simulator.headSuccessTitle).toHaveText('Simulation Successful');
  await expect(simulator.lblSuccessMessage).toHaveText('SAML response successfully transmitted to the test endpoint URL.');
  
  //------verify ACS Url and Public Key values---------
  await expect(simulator.txtACSUrl).toHaveValue(ACSUrl);
  await expect(simulator.txtPublicKey).toHaveValue(validCertificate);
});


// -------------------------------------------------------
// TC-006: Validate Back to Home link takes back to Homepage
// -------------------------------------------------------
test('TC-006: Validate Back to Home link takes back to Homepage', async ({ page }) => {
  // Initialize the POM with the current Playwright Page instance
  const home = new HomePage(page);
  const simulator = new SimulatorPage(page);
    
  // Navigate to the app (defaults to frontendURL if none provided)
  await home.goto(frontendURL);

  // ---------- Verify Homepage successfully visible ----------
  await expect(home.textACSUrl).toBeVisible();
  await expect(home.publicKey).toBeVisible();
 
  // ---------Run Simulation with valid data ----------
  await home.runSimulation(ACSUrl,validCertificate);

  await expect(simulator.lblACSUrl).toBeVisible();

  //-------Successful Simulation Text verification-----
  await expect(simulator.headSuccessTitle).toHaveText('Simulation Successful');
  await expect(simulator.lblSuccessMessage).toHaveText('SAML response successfully transmitted to the test endpoint URL.');
  
  //-----go back to homepage and verify successful landing-------
  await simulator.goToHomepage();
  await expect(home.textACSUrlLbl).toBeVisible();
});

// -------------------------------------------------------
// TC-007: Validate Re-run simulation button executes simulation again
// -------------------------------------------------------
test('TC-007: Validate Re-run simulation button executes simulation again', async ({ page }) => {
  // Initialize the POM with the current Playwright Page instance
  const home = new HomePage(page);
  const simulator = new SimulatorPage(page);
  // Navigate to the app (defaults to frontendURL if none provided)
  await home.goto(frontendURL);
await page.waitForTimeout(3000);
  // ---------- Verify Homepage successfully visible ----------
  await expect(home.textACSUrl).toBeVisible();
  await expect(home.publicKey).toBeVisible();
 
  // ---------Run Simulation with valid data ----------
  await home.runSimulation(ACSUrl,validCertificate)

  await expect(simulator.lblACSUrl).toBeVisible();

  //-------Successful Simulation Text verification-----
  await expect(simulator.headSuccessTitle).toHaveText('Simulation Successful');
  await expect(simulator.lblSuccessMessage).toHaveText('SAML response successfully transmitted to the test endpoint URL.');
  
  // ---------- 🔎 Network Capture for Re-run Simulation ----------
  const responsePromise = page.waitForResponse((res) =>
    res.url().includes('/api/saml/login') && res.request().method() === 'POST'
  );

  await simulator.btnReRunSimulation.click();

  const response = await responsePromise;

  // ----------Assert success status on re-run and response contains xml----
  expect(response.status()).toBe(201);

  const json = await response.json();
  expect(json).toHaveProperty('xml');

});

