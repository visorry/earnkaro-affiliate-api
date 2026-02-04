/**
 * EarnKaro Service - Browser automation for affiliate link generation
 */

const puppeteer = require('puppeteer');

class EarnKaroService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isAuthenticated = false;
    this.email = process.env.EARNKARO_EMAIL;
    this.password = process.env.EARNKARO_PASSWORD;
    this.headless = process.env.HEADLESS === 'true';
  }

  /**
   * Initialize browser and perform login
   */
  async initialize() {
    try {
      console.log('Initializing browser...');

      // Use system Chrome on Mac, Puppeteer finds Chrome automatically on Linux
      const executablePath = process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : undefined; // Let Puppeteer find Chrome automatically

      this.browser = await puppeteer.launch({
        executablePath: executablePath,
        headless: this.headless ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-gpu'
        ],
        userDataDir: './sessions', // Save session for persistent auth
        ignoreHTTPSErrors: true
      });

      this.page = await this.browser.newPage();

      // Set realistic viewport and user agent
      await this.page.setViewport({ width: 1366, height: 768 });
      await this.page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Add extra headers to look more legitimate
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
      });

      // Mask automation indicators
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });

      // Check if already authenticated from previous session
      try {
        await this.page.goto('https://earnkaro.com', {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });
        await this.page.waitForTimeout(2000);
      } catch (navError) {
        console.error('Navigation error:', navError.message);
        throw new Error(`Failed to load EarnKaro website: ${navError.message}`);
      }

      const isLoggedIn = await this.checkIfLoggedIn();

      if (!isLoggedIn) {
        console.log('Not authenticated, performing login...');
        await this.login();
      } else {
        console.log('Already authenticated from previous session');
        this.isAuthenticated = true;
      }

      console.log('Initialization complete');
    } catch (error) {
      console.error('Initialization failed:', error.message);
      throw new Error(`Failed to initialize EarnKaro service: ${error.message}`);
    }
  }

  /**
   * Check if user is already logged in
   */
  async checkIfLoggedIn() {
    try {
      // Check URL first - if we're on homepage after redirect, we're likely logged in
      const currentUrl = this.page.url();
      if (currentUrl === 'https://earnkaro.com/' && currentUrl !== 'https://earnkaro.com/login') {
        // Try to navigate to create-earn-link page to verify
        try {
          await this.page.goto('https://earnkaro.com/create-earn-link', {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });
          await this.page.waitForTimeout(1000);

          // If we can access this page, we're logged in
          const newUrl = this.page.url();
          if (newUrl.includes('create-earn-link')) {
            return true;
          }
        } catch (e) {
          // Continue with other checks
        }
      }

      // Check for common indicators of being logged in
      const loggedInIndicators = [
        'a[href*="dashboard"]',
        'a[href*="create-earn-link"]',
        '.user-profile',
        'a[href*="logout"]',
        'button[href*="logout"]'
      ];

      for (const selector of loggedInIndicators) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            return true;
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform login to EarnKaro
   * Note: EarnKaro may use either password or SMS OTP verification
   */
  async login() {
    try {
      if (!this.email) {
        throw new Error('EARNKARO_EMAIL not provided in environment variables');
      }

      // Navigate to login page
      await this.page.goto('https://earnkaro.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      await this.page.waitForTimeout(2000);

      // Find email/phone input field
      const emailInput = await this.page.$('#uname');

      if (!emailInput) {
        // Maybe we're already on a logged-in page, check if logged in
        const isLoggedIn = await this.checkIfLoggedIn();
        if (isLoggedIn) {
          console.log('Already logged in from previous session!');
          this.isAuthenticated = true;
          return;
        }
        throw new Error('Could not find email input field (#uname) and not logged in');
      }

      // Clear and enter email
      await this.page.click('#uname', { clickCount: 3 });
      await this.page.type('#uname', this.email, { delay: 100 });
      await this.page.waitForTimeout(1000);

      // Click Continue button using XPath
      const continueButtons = await this.page.$x("//button[contains(text(), 'Continue')]");
      if (continueButtons.length > 0) {
        await continueButtons[0].click();
        console.log('Email entered, waiting for next step...');
        await this.page.waitForTimeout(3000);
      } else {
        throw new Error('Could not find Continue button');
      }

      // Check if password field appears or OTP field
      const passwordInput = await this.page.$('input[type="password"]');

      if (passwordInput) {
        // Password-based login
        console.log('\n========================================');
        console.log('Password login detected');
        console.log('========================================\n');

        if (!this.password) {
          throw new Error('Password field found but EARNKARO_PASSWORD not provided in environment');
        }

        await this.page.type('input[type="password"]', this.password, { delay: 100 });
        await this.page.waitForTimeout(1000);

        // Find and click Continue button (after password)
        const submitButtons = await this.page.$x("//button[contains(text(), 'Continue')]");
        if (submitButtons.length > 0) {
          await submitButtons[0].click();
          console.log('Password entered, logging in...');
          await this.page.waitForTimeout(5000);
        } else {
          throw new Error('Could not find Continue button after password');
        }

        // Verify login - check URL change
        const currentUrl = this.page.url();
        if (currentUrl === 'https://earnkaro.com/' || currentUrl.includes('dashboard')) {
          this.isAuthenticated = true;
          console.log('\n✓ Login successful! Session saved.\n');
          return;
        }

        // Also try the regular check
        const isLoggedIn = await this.checkIfLoggedIn();
        if (isLoggedIn) {
          this.isAuthenticated = true;
          console.log('\n✓ Login successful! Session saved.\n');
          return;
        } else {
          throw new Error('Login failed. Could not verify login state.');
        }

      } else {
        // OTP-based login
        console.log('\n========================================');
        console.log('OTP login detected - Manual intervention required');
        console.log('PLEASE ENTER OTP IN THE BROWSER WINDOW');
        console.log('The session will be saved for future use');
        console.log('Waiting for login completion...');
        console.log('========================================\n');

        // Wait for successful login (check for dashboard or profile)
        const maxWaitTime = 120000; // 2 minutes
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
          const isLoggedIn = await this.checkIfLoggedIn();
          if (isLoggedIn) {
            this.isAuthenticated = true;
            console.log('\n✓ Login successful! Session saved.\n');
            return;
          }
          await this.page.waitForTimeout(2000);
        }

        throw new Error('Login timeout. Please complete OTP verification within 2 minutes.');
      }

    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Ensure user is authenticated before operations
   */
  async ensureAuthenticated() {
    if (!this.isAuthenticated) {
      await this.login();
    }
  }

  /**
   * Convert product URL to affiliate link
   * @param {string} productUrl - The product URL to convert
   * @returns {Promise<string>} - The generated affiliate link
   */
  async convertLink(productUrl) {
    try {
      await this.ensureAuthenticated();

      console.log(`Converting link: ${productUrl}`);

      // Navigate to link creation page
      await this.page.goto('https://earnkaro.com/create-earn-link', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);

      // Find the correct URL input field by ID
      const urlInput = await this.page.$('#deallink');

      if (!urlInput) {
        throw new Error('Could not find URL input field (#deallink) on create-earn-link page');
      }

      // Clear and enter the product URL
      await this.page.click('#deallink', { clickCount: 3 });
      await this.page.type('#deallink', productUrl, { delay: 50 });
      await this.page.waitForTimeout(1500);

      console.log('URL entered, clicking MAKE PROFIT LINK button...');

      // Find and click "MAKE PROFIT LINK" button
      const convertButtons = await this.page.$x("//button[contains(text(), 'MAKE PROFIT LINK')]");
      if (convertButtons.length === 0) {
        throw new Error('Could not find "MAKE PROFIT LINK" button');
      }

      await convertButtons[0].click();
      console.log('Button clicked, waiting for result dialog...');

      // Wait for the link to be generated and dialog to appear
      await this.page.waitForTimeout(6000);

      // Find and click the COPY LINK button
      const copyButtons = await this.page.$x("//button[contains(text(), 'COPY LINK')]");
      if (copyButtons.length === 0) {
        throw new Error('Could not find "COPY LINK" button. Link generation may have failed.');
      }

      console.log('Found COPY LINK button, clicking to copy...');
      await copyButtons[0].click();
      await this.page.waitForTimeout(1000);

      // Read the affiliate link from clipboard
      const affiliateLink = await this.page.evaluate(async () => {
        try {
          return await navigator.clipboard.readText();
        } catch (e) {
          throw new Error('Unable to read clipboard: ' + e.message);
        }
      });

      if (!affiliateLink || !affiliateLink.startsWith('http')) {
        throw new Error('Invalid affiliate link retrieved from clipboard');
      }

      console.log('✓ Affiliate link generated successfully');
      return affiliateLink.trim();

    } catch (error) {
      console.error('Link conversion error:', error.message);
      throw new Error(`Failed to convert link: ${error.message}`);
    }
  }

  /**
   * Gracefully shutdown browser
   */
  async shutdown() {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log('Browser closed successfully');
      }
    } catch (error) {
      console.error('Error closing browser:', error.message);
    }
  }
}

module.exports = EarnKaroService;
