import { Page, Locator } from '@playwright/test';

export class ErrorPage {
  constructor(private page: Page) {}

 get title(): Locator {
    return this.page.locator('h1.error-title');
  }

  // Always present
  get errorCode(): Locator {
    return this.page.locator('#error-code');
  }

  get errorReason(): Locator {
    return this.page.locator('#error-reason'); // textarea or div showing the reason
  }

  get retryBtn(): Locator {
    return this.page.locator("//button[normalize-space()='Retry Simulation']");
  }

  get backHome(): Locator {
    return this.page.locator("//a[normalize-space()='Back to Home Page']");
  }

}