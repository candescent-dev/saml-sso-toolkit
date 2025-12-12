
import { Page, Locator } from '@playwright/test';
import { HomePage } from './homePage';

export class SimulatorPage {
  constructor(private page: Page) {}

  // ✅ Lazy getters — locator is created only when accessed

  get headSuccessTitle(): Locator {
    return this.page.locator("//h1[@class='success-title']");
  }

  get lblSuccessMessage(): Locator {
    return this.page.locator("//p[@class='success-message']");
  }
  
  get lblACSUrl(): Locator {
    return this.page.locator("//label[@for='acs-url']");
  }

  get txtACSUrl(): Locator {
    return this.page.locator("//input[@id='acs-url']");
  }

  get lblPublicKey(): Locator {
    return this.page.locator("//label[@for='certificate']");
  }

  get txtPublicKey(): Locator {
    return this.page.locator("//textarea[@id='certificate']");
  }

  get btnReRunSimulation(): Locator {
    return this.page.locator("//button[contains(text(),'Run Another Simulation')]");
  }

  get btnXmlAssertion(): Locator {
    return this.page.locator("//button[@class='icon-button']");
  }

  get lnkBackToHome(): Locator {
    return this.page.locator("//a[contains(text(),'Back to Home Page')]");
  }

  //Run simulation
  async goToHomepage() {
    await this.lnkBackToHome.isVisible();
    await this.lnkBackToHome.click();
    return HomePage;
  }
}