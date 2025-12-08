
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
