import { test, expect, request } from '@playwright/test';
import fs from 'fs';

const backendUrl = 'http://localhost:9000';
const frontendURL = 'http://localhost:8000';

// ✅ Expected exact helper texts (adjust if your app differs)
const EXPECTED_ACS_HELPER =
  'Vendors can expect to receive the SAML response here.';
const EXPECTED_CERT_HELPER =
  'Public certificate required to encrypt the SAML assertion before it is sent to the Test ACS URL.';


    // TC-001: Check backend health
    test('backend should return status 200 for /api/health', async () => {
    const apiContext = await request.newContext();
    console.log(`[INFO] Health check URL: ${backendUrl}/api/health`);
    const response = await apiContext.get(backendUrl + '/api/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    });

    // TC-002: Validate all fields are visible or not.
    test('Validate homepage elements and helper texts', async ({ page }) => {
    await page.goto('http://localhost:8000');

    // ✅ ACS URL input & helper
    await expect(page.locator('//input[@id="acsUrl"]')).toBeVisible();
    await expect(page.locator("//p[contains(text(),'Vendors can expect to receive the SAML response he')]"))
        .toHaveText('Vendors can expect to receive the SAML response here.');

    // ✅ Public Certificate input & helper
    await expect(page.locator('//textarea[@id="publicCertificate"]')).toBeVisible();
    await expect(page.locator("//p[contains(text(),'Public certificate required to encrypt the SAML as')]"))
        .toHaveText('Public certificate required to encrypt the SAML assertion before it is sent to the Test ACS URL.');

    // ✅ Vendor info inputs
    await expect(page.locator('//input[@id="firstName"]')).toBeVisible();
    await expect(page.locator('//input[@id="lastName"]')).toBeVisible();
    await expect(page.locator('//input[@id="memberId"]')).toBeVisible();
    await expect(page.locator('//input[@id="email"]')).toBeVisible();

    // ✅ Buttons
    await expect(page.locator("//button[normalize-space()='Run Simulation']")).toBeVisible();
    await expect(page.locator("//button[normalize-space()='Candescent Public Key']")).toBeVisible();
    });
