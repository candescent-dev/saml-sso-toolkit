
import { Page, Locator } from '@playwright/test';

export class SimulatorPage {
  constructor(private page: Page) {}

  // ✅ Lazy getters — locator is created only when accessed

  get textACSUrl(): Locator {
    return this.page.locator("//label[@for='acs-url']");
  }
}