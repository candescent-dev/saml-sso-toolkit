
// Page Object Model for the Home page.
// - Lazy getters ensure locators are only created when actually used.
// - Exported URL constants keep endpoints centralized and reusable across tests.

import { Page, Locator } from '@playwright/test';

// ✅ Global URLs (exported)
// Use environment variables in CI for flexibility if needed.
// Example in CI: FRONTEND_URL, BACKEND_URL, HEALTH_URL
export const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:9000';
export const frontendURL = process.env.FRONTEND_URL ?? 'http://localhost:8000';
export const healthURL = process.env.HEALTH_URL ?? '/api/health';
export const validACSUrl =process.env.VALID_ACS_URL ?? 'http://localhost:8000/test/acs';

export const validCertificate = `-----BEGIN CERTIFICATE-----
MIIDqDCCApACCQDxEV5XnYNRzzANBgkqhkiG9w0BAQsFADCBlTELMAkGA1UEBhMC
VVMxEDAOBgNVBAgMB0dlb3JnaWExEDAOBgNVBAcMB0F0bGFudGExEzARBgNVBAoM
CkNhbmRlc2NlbnQxCzAJBgNVBAsMAklUMRswGQYDVQQDDBJpZHAuY2FuZGVzY2Vu
dC5jb20xIzAhBgkqhkiG9w0BCQEWFGFkbWluQGNhbmRlc2NlbnQuY29tMB4XDTI1
MTEyNTE0MTQyN1oXDTMwMTEyNDE0MTQyN1owgZUxCzAJBgNVBAYTAlVTMRAwDgYD
VQQIDAdHZW9yZ2lhMRAwDgYDVQQHDAdBdGxhbnRhMRMwEQYDVQQKDApDYW5kZXNj
ZW50MQswCQYDVQQLDAJJVDEbMBkGA1UEAwwSaWRwLmNhbmRlc2NlbnQuY29tMSMw
IQYJKoZIhvcNAQkBFhRhZG1pbkBjYW5kZXNjZW50LmNvbTCCASIwDQYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBAN+soEjTOAAC2ZSrPekQdZfKa+9i3dsuC5/ZJ0W6
SV8gcB3Bj3okl5lmaeGFPfiITakr1W1CsI3RMMbT1E0u7zOHziiVZURzFOhWe6hZ
wzfA3XGESLHtSPJ5Xq+TzzWC3FWbtRpP9IKYp89x0q4kvUgcXnlCDCS3SdshXgtM
YKaGWqnz9QatsOPRYzXUnR+xjJ1xW3jjK1cXZ54iXmBnLmVmilTZrt8V1rsre9GU
zkO/Vxhb8LXSK5OGjxm+5qqWnsHKWoNjmai2cybe/Cw2KlnkZ6Wg568is9AaMUKD
bQxfyzF2HUX3FlC0b5kZAoiafllV7PsWmoPffzYLIZd1KncCAwEAATANBgkqhkiG
9w0BAQsFAAOCAQEA13V3AypnvXGw5CZ35AhOiXQqFgwyoPOh+QOVcg1g1gcA/GS3
kjkR8k6W63ygSjXQgO/wqYgGbGM6Y63HLnk9qFtOrjN8blnNlzTthDrlzmSA8gQe
mvuGQvzD07r1tmZ+geM0qyWdaSF+qDgvSgWDf2jsqt0oOpoaZruRwvrR9rDM894S
WJU+DUOrZq2AHoX/WEEOzW0Xv+hDvYaSN6MRIhjI9gpLVYePucJO+uUFrVkxBk7V
eDYzQeH3at2IQ1sLnXM/mjgP4andCbAmO2Fu1gdTJrQDPUYR4PfRFgx21hznvbGq
bQWIuQDwgWcnppYvbA/BzUiXXg8Mg3xg4X9oGQ==
-----END CERTIFICATE-----`;

export class HomePage {
  constructor(private page: Page) {}

  // ---------- Lazy locator getters (initialized only on access) ----------
  get firstName(): Locator {
    return this.page.locator('//input[@id="firstName"]');
  }
  get lastName(): Locator {
    return this.page.locator('//input[@id="lastName"]');
  }
  get memberId(): Locator {
    return this.page.locator('//input[@id="memberId"]');
  }
  get email(): Locator {
    return this.page.locator('//input[@id="email"]');
  }
  get publicKey(): Locator {
    return this.page.locator('//textarea[@id="publicCertificate"]');
  }
  get publicKeyLbl(): Locator {
    return this.page.locator(
      "//p[contains(text(),'Public certificate required to encrypt the SAML as')]"
    );
  }
  get runSimulationBtn(): Locator {
    return this.page.locator("//button[normalize-space()='Run Simulation']");
  }
  get publicKeyDwdBtn(): Locator {
    return this.page.locator("//button[normalize-space()='Candescent Public Key']");
  }
  get textACSUrl(): Locator {
    return this.page.locator('//input[@id="acsUrl"]');
  }
  get textACSUrlLbl(): Locator {
    return this.page.locator(
      "//p[contains(text(),'Vendors can expect to receive the SAML response he')]"
    );
  }

  // ---------- Navigation ----------
  async goto(url: string = frontendURL) {
    // Keeping a default makes test calls shorter: await home.goto();
    await this.page.goto(url);
  }
}
