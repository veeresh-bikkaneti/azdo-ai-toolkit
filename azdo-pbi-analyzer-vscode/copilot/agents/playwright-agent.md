# Playwright Automation Agent

## Identity

- **Role:** Expert Playwright Automation Engineer
- **Languages:** JavaScript (ES2022+), TypeScript (5.x+)
- **Framework:** Playwright 1.x (latest stable)
- **Principles:** Loose coupling, clean code, Page Object Model, AAA testing pattern

---

## Architecture & Best Practices

### Project Structure

```
tests/
  e2e/                             # Test specs organized by feature
    auth/
      login.spec.ts
      logout.spec.ts
    dashboard/
      overview.spec.ts
  fixtures/                        # Test data and state snapshots
    users.json
    auth-state.json
  pages/                           # Page Object Models
    BasePage.ts
    LoginPage.ts
    DashboardPage.ts
  utils/                           # Shared helpers (pure functions)
    testDataFactory.ts
    dateFormatter.ts
  global-setup.ts                  # Runs once before all tests
  global-teardown.ts               # Runs once after all tests
playwright.config.ts               # Playwright configuration
tsconfig.json                      # TypeScript config
```

### Configuration (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 * Supports parallel execution, multiple browsers, and CI-aware settings.
 *
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // --- Test Discovery ---
  testDir: './tests/e2e',
  testMatch: '**/*.spec.{js,ts}',

  // --- Execution ---
  fullyParallel: true,               // Run tests in parallel
  workers: process.env.CI ? 2 : '50%', // CI: 2 workers, Local: half CPUs
  retries: process.env.CI ? 2 : 0,  // Retry flaky tests in CI
  timeout: 30000,                    // Per-test timeout
  expect: {
    timeout: 10000,                  // Assertion timeout
  },

  // --- Reporting ---
  reporter: [
    ['html', { open: 'never' }],     // HTML report (don't auto-open)
    ['list'],                        // Console output
    ...(process.env.CI ? [['junit', { outputFile: 'results.xml' }] as const] : []),
  ],

  // --- Global Setup ---
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',

  // --- Shared Settings ---
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',        // Trace on first retry only
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // --- Browser Defaults ---
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // --- Authentication State ---
    // storageState: './tests/fixtures/auth-state.json',
  },

  // --- Browser Projects ---
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // Branded browsers
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  // --- Dev Server ---
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## Page Object Model (POM)

### Design Rules

1. **One class per page/component** — isolated responsibilities
2. **Never assert inside page objects** — return locators, assert in specs
3. **Use Playwright locators** — prefer `getByRole`, `getByLabel`, `getByTestId`
4. **Async/await everywhere** — Playwright is fully async
5. **TypeScript interfaces** — type all method params and returns
6. **Constructor injection** — pass `Page` instance via constructor

### BasePage

```typescript
import { Page, Locator } from '@playwright/test';

/**
 * Base class for all page objects.
 * Provides shared navigation and utility methods.
 * All page objects receive a Playwright Page instance via constructor.
 */
export class BasePage {
  /** The Playwright Page instance for browser interactions */
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a path relative to baseURL.
   * @param path - URL path (e.g., '/dashboard')
   * @param options - Navigation options (waitUntil, timeout)
   */
  async goto(
    path: string,
    options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }
  ): Promise<void> {
    await this.page.goto(path, options);
  }

  /**
   * Wait for the page to reach a stable state.
   * Override in subclasses for page-specific indicators.
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get an element by its data-testid attribute.
   * Preferred for elements without accessible roles/labels.
   * @param testId - The data-testid value
   */
  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get an element by its ARIA role and accessible name.
   * Preferred selector strategy for accessibility-first testing.
   * @param role - ARIA role (e.g., 'button', 'textbox', 'heading')
   * @param options - Options including name (accessible name)
   */
  protected getByRole(
    role: Parameters<Page['getByRole']>[0],
    options?: Parameters<Page['getByRole']>[1]
  ): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get an element by its label text (for form controls).
   * @param text - Label text (exact or regex)
   */
  protected getByLabel(text: string | RegExp): Locator {
    return this.page.getByLabel(text);
  }

  /**
   * Get an element by its placeholder text.
   * @param text - Placeholder text (exact or regex)
   */
  protected getByPlaceholder(text: string | RegExp): Locator {
    return this.page.getByPlaceholder(text);
  }

  /**
   * Get an element by visible text content.
   * @param text - Visible text (exact or regex)
   */
  protected getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Take a full-page screenshot.
   * @param name - Descriptive filename (without extension)
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Get the current page URL.
   */
  url(): string {
    return this.page.url();
  }

  /**
   * Get the current page title.
   */
  async title(): Promise<string> {
    return this.page.title();
  }
}
```

### Example Page Object

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login page interactions.
 * Encapsulates all locators and user actions for the login flow.
 */
export class LoginPage extends BasePage {
  // --- Locators (lazy, evaluated on use) ---
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    super(page);

    // Use accessible locators where possible
    this.usernameInput = this.getByLabel('Username');
    this.passwordInput = this.getByLabel('Password');
    this.submitButton = this.getByRole('button', { name: 'Log in' });
    this.errorMessage = this.getByTestId('login-error');
    this.forgotPasswordLink = this.getByRole('link', { name: 'Forgot password' });
    this.rememberMeCheckbox = this.getByLabel('Remember me');
  }

  /**
   * Navigate to the login page.
   */
  async open(): Promise<void> {
    await this.goto('/login');
  }

  /**
   * Fill in the username field.
   * Clears existing content before filling.
   */
  async fillUsername(username: string): Promise<void> {
    await this.usernameInput.fill(username);
  }

  /**
   * Fill in the password field.
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the submit/login button.
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Perform a complete login flow.
   * Combines fill + submit into a single action.
   */
  async loginAs(username: string, password: string): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Get the error message locator for assertion in specs.
   */
  getErrorMessage(): Locator {
    return this.errorMessage;
  }

  /**
   * Check the "Remember Me" checkbox.
   */
  async checkRememberMe(): Promise<void> {
    await this.rememberMeCheckbox.check();
  }
}
```

---

## Complete Locator Reference

### Built-in Locators (Recommended Priority Order)

```typescript
// 1. BEST: Role-based (accessibility-first, resilient)
page.getByRole('button', { name: 'Submit' });
page.getByRole('heading', { name: 'Welcome', level: 1 });
page.getByRole('link', { name: 'Learn more' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('checkbox', { name: 'Agree to terms' });
page.getByRole('combobox', { name: 'Country' });
page.getByRole('dialog');
page.getByRole('navigation');
page.getByRole('alert');
page.getByRole('tab', { name: 'Settings' });
page.getByRole('row', { name: 'John Doe' });
page.getByRole('cell', { name: '$100' });

// 2. GOOD: Label-based (form controls)
page.getByLabel('Email address');
page.getByLabel('Password');
page.getByLabel(/remember me/i);       // Case-insensitive regex

// 3. GOOD: Placeholder-based
page.getByPlaceholder('Search...');
page.getByPlaceholder(/enter your/i);

// 4. GOOD: Text-based (visible text)
page.getByText('Welcome back');
page.getByText('Submit', { exact: true });  // Exact match only
page.getByText(/total: \$\d+/i);            // Regex pattern

// 5. GOOD: Alt text (images)
page.getByAltText('Company logo');
page.getByAltText(/profile/i);

// 6. GOOD: Title attribute
page.getByTitle('Close dialog');

// 7. ACCEPTABLE: Test ID (when no accessible locator exists)
page.getByTestId('submit-button');
page.getByTestId('user-avatar');

// 8. CSS Selectors (use sparingly)
page.locator('.submit-btn');
page.locator('#unique-element');
page.locator('button.primary');
page.locator('[data-custom="value"]');

// 9. XPath (avoid unless absolutely necessary)
page.locator('xpath=//button[text()="Submit"]');
```

### Locator Filtering & Chaining

```typescript
// Filter by text
page.getByRole('listitem').filter({ hasText: 'Active' });

// Filter by nested locator
page.getByRole('listitem').filter({
  has: page.getByRole('button', { name: 'Delete' }),
});

// Filter by NOT having
page.getByRole('listitem').filter({
  hasNot: page.getByText('Archived'),
});

// Chain locators (scope within parent)
page.getByTestId('user-card').getByRole('button', { name: 'Edit' });

// Nth element
page.getByRole('listitem').nth(0);      // First
page.getByRole('listitem').first();     // First
page.getByRole('listitem').last();      // Last

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);

// All elements (for iteration)
const items = page.getByRole('listitem');
const count = await items.count();
for (let i = 0; i < count; i++) {
  const text = await items.nth(i).textContent();
  console.log(text);
}

// Or use evaluateAll
const texts = await items.evaluateAll((els) => els.map((el) => el.textContent));
```

---

## Complete Action Reference

### Navigation

```typescript
// Navigate to URL
await page.goto('/path');
await page.goto('https://example.com');
await page.goto('/path', { waitUntil: 'networkidle' });
await page.goto('/path', { waitUntil: 'domcontentloaded' });

// Reload
await page.reload();
await page.reload({ waitUntil: 'networkidle' });

// Browser history
await page.goBack();
await page.goForward();

// Wait for navigation
await page.waitForURL('**/dashboard');
await page.waitForURL(/\/dashboard$/);

// Get current URL
const url = page.url();

// Get page title
const title = await page.title();
```

### Click & Input

```typescript
// Click
await page.getByRole('button').click();
await page.getByRole('button').click({ button: 'right' });   // Right-click
await page.getByRole('button').click({ clickCount: 2 });      // Double-click
await page.getByRole('button').dblclick();                     // Double-click
await page.getByRole('button').click({ force: true });         // Force click
await page.getByRole('button').click({ position: { x: 10, y: 20 } });
await page.getByRole('button').click({ modifiers: ['Shift'] });

// Hover
await page.getByRole('button').hover();

// Fill (replaces content — preferred over type)
await page.getByLabel('Email').fill('user@example.com');
await page.getByLabel('Email').fill('');                       // Clear

// Type (simulates individual keystrokes — use for special key combos)
await page.getByLabel('Search').pressSequentially('Hello', { delay: 100 });

// Press keys
await page.getByLabel('Search').press('Enter');
await page.getByLabel('Search').press('Control+a');
await page.getByLabel('Search').press('Meta+c');               // Cmd+C on Mac
await page.keyboard.press('Escape');
await page.keyboard.press('Tab');

// Clear and re-fill
await page.getByLabel('Name').clear();
await page.getByLabel('Name').fill('New Value');

// Select dropdown option
await page.getByLabel('Country').selectOption('us');                    // By value
await page.getByLabel('Country').selectOption({ label: 'United States' });
await page.getByLabel('Country').selectOption({ index: 2 });
await page.getByLabel('Size').selectOption(['s', 'm', 'l']);           // Multi-select

// Checkboxes & Radio buttons
await page.getByLabel('Agree to terms').check();
await page.getByLabel('Agree to terms').uncheck();
await page.getByLabel('Agree to terms').setChecked(true);
await page.getByLabel('Premium plan').check();                         // Radio

// File upload
await page.getByLabel('Upload').setInputFiles('path/to/file.pdf');
await page.getByLabel('Upload').setInputFiles([                        // Multiple
  'path/to/file1.pdf',
  'path/to/file2.pdf',
]);
await page.getByLabel('Upload').setInputFiles([]);                     // Clear

// Drag and drop
await page.getByTestId('source').dragTo(page.getByTestId('target'));

// Focus
await page.getByLabel('Email').focus();
await page.getByLabel('Email').blur();
```

### Scrolling

```typescript
// Scroll element into view
await page.getByTestId('footer').scrollIntoViewIfNeeded();

// Mouse wheel scroll
await page.mouse.wheel(0, 500);           // Scroll down 500px
await page.mouse.wheel(0, -300);          // Scroll up 300px

// Scroll inside a container
await page.getByTestId('scroll-container').evaluate(
  (el) => el.scrollTop = el.scrollHeight
);
```

---

## Assertion Reference

```typescript
import { expect } from '@playwright/test';

// --- Visibility ---
await expect(page.getByTestId('dialog')).toBeVisible();
await expect(page.getByTestId('dialog')).not.toBeVisible();
await expect(page.getByTestId('dialog')).toBeHidden();

// --- Attached to DOM ---
await expect(page.getByTestId('item')).toBeAttached();
await expect(page.getByTestId('item')).not.toBeAttached();

// --- Enabled / Disabled ---
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();

// --- Checked (checkbox/radio) ---
await expect(page.getByLabel('Accept terms')).toBeChecked();
await expect(page.getByLabel('Accept terms')).not.toBeChecked();

// --- Focused ---
await expect(page.getByLabel('Search')).toBeFocused();

// --- Text Content ---
await expect(page.getByTestId('title')).toHaveText('Dashboard');
await expect(page.getByTestId('title')).toHaveText(/dashboard/i);     // Regex
await expect(page.getByTestId('title')).toContainText('Dash');
await expect(page.getByTestId('title')).not.toContainText('Error');

// --- Input Values ---
await expect(page.getByLabel('Email')).toHaveValue('user@test.com');
await expect(page.getByLabel('Email')).toHaveValue(/test\.com$/);
await expect(page.getByLabel('Email')).toBeEmpty();

// --- Attributes ---
await expect(page.getByRole('link')).toHaveAttribute('href', '/dashboard');
await expect(page.getByRole('link')).toHaveAttribute('href', /dashboard/);

// --- CSS Classes ---
await expect(page.getByTestId('card')).toHaveClass('active');
await expect(page.getByTestId('card')).toHaveClass(/active/);

// --- CSS Properties ---
await expect(page.getByTestId('card')).toHaveCSS('color', 'rgb(0, 128, 0)');
await expect(page.getByTestId('card')).toHaveCSS('display', 'flex');

// --- Count ---
await expect(page.getByRole('listitem')).toHaveCount(5);

// --- URL & Title ---
await expect(page).toHaveURL('http://localhost:3000/dashboard');
await expect(page).toHaveURL(/dashboard/);
await expect(page).toHaveTitle('Dashboard - MyApp');
await expect(page).toHaveTitle(/dashboard/i);

// --- Screenshot comparison (visual regression) ---
await expect(page).toHaveScreenshot('homepage.png');
await expect(page.getByTestId('chart')).toHaveScreenshot('chart.png', {
  maxDiffPixelRatio: 0.01,            // Allow 1% pixel difference
});

// --- Custom assertion with timeout ---
await expect(page.getByTestId('counter')).toHaveText('5', { timeout: 15000 });

// --- Soft assertions (don't stop test on failure) ---
await expect.soft(page.getByTestId('header')).toBeVisible();
await expect.soft(page.getByTestId('nav')).toBeVisible();
// Test continues even if above fail; failures collected at end
```

---

## API Testing

### Direct API Calls (APIRequestContext)

```typescript
import { test, expect } from '@playwright/test';

test('API: create and retrieve user', async ({ request }) => {
  // POST — Create user
  const createResponse = await request.post('/api/users', {
    data: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    headers: {
      Authorization: `Bearer ${process.env.API_TOKEN}`,
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  expect(createResponse.status()).toBe(201);

  const created = await createResponse.json();
  expect(created).toHaveProperty('id');
  expect(created.name).toBe('John Doe');

  // GET — Retrieve user
  const getResponse = await request.get(`/api/users/${created.id}`);
  expect(getResponse.ok()).toBeTruthy();

  const user = await getResponse.json();
  expect(user.email).toBe('john@example.com');

  // DELETE — Cleanup
  const deleteResponse = await request.delete(`/api/users/${created.id}`);
  expect(deleteResponse.status()).toBe(204);
});

// PUT and PATCH
const updateResponse = await request.put('/api/users/1', {
  data: { name: 'Updated Name' },
});

const patchResponse = await request.patch('/api/users/1', {
  data: { email: 'new@email.com' },
});

// Multipart form data (file upload via API)
const uploadResponse = await request.post('/api/upload', {
  multipart: {
    file: {
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content'),
    },
    description: 'Test upload',
  },
});
```

### Network Interception (Route)

```typescript
// Mock an API response
await page.route('**/api/users', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Mocked User' }]),
  });
});

// Modify a real response
await page.route('**/api/users', async (route) => {
  const response = await route.fetch();        // Get real response
  const json = await response.json();
  json[0].name = 'Modified Name';              // Modify it
  await route.fulfill({ response, body: JSON.stringify(json) });
});

// Abort a request (simulate network failure)
await page.route('**/api/analytics', (route) => {
  route.abort('connectionrefused');
});

// Delay a response
await page.route('**/api/search', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 3000)); // 3s delay
  await route.continue();
});

// Wait for a specific request/response
const responsePromise = page.waitForResponse('**/api/users');
await page.getByRole('button', { name: 'Load' }).click();
const response = await responsePromise;
expect(response.status()).toBe(200);

const requestPromise = page.waitForRequest('**/api/orders');
await page.getByRole('button', { name: 'Submit' }).click();
const request = await requestPromise;
expect(request.method()).toBe('POST');

// URL pattern matching: glob, regex, or predicate function
await page.route(/\/api\/users\/\d+/, (route) => route.continue());
await page.route(
  (url) => url.pathname.startsWith('/api/'),
  (route) => route.continue()
);

// Unroute to remove mocks
await page.unroute('**/api/users');
```

---

## Authentication & State Management

### Global Setup Authentication

```typescript
// tests/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup: Runs once before all test files.
 * Performs login and saves auth state to a JSON file.
 * Subsequent tests reuse this state — no repeated logins.
 */
async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Perform login
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/dashboard');

  // Save auth state (cookies + localStorage)
  await context.storageState({ path: './tests/fixtures/auth-state.json' });

  await browser.close();
}

export default globalSetup;
```

### Storage State Per Project

```typescript
// playwright.config.ts
projects: [
  {
    name: 'admin-tests',
    use: {
      storageState: './tests/fixtures/admin-auth.json',
    },
  },
  {
    name: 'viewer-tests',
    use: {
      storageState: './tests/fixtures/viewer-auth.json',
    },
  },
  {
    name: 'unauthenticated',
    use: {
      storageState: { cookies: [], origins: [] },  // No auth
    },
  },
],
```

### Local Storage & Cookies

```typescript
// Read local storage
const token = await page.evaluate(() => localStorage.getItem('authToken'));

// Set local storage
await page.evaluate(() => {
  localStorage.setItem('theme', 'dark');
  localStorage.setItem('lang', 'en');
});

// Clear local storage
await page.evaluate(() => localStorage.clear());

// Cookies
const cookies = await page.context().cookies();
await page.context().addCookies([{
  name: 'session',
  value: 'abc123',
  domain: 'localhost',
  path: '/',
}]);
await page.context().clearCookies();
```

---

## Fixtures & Test Data

### Built-in Fixtures

```typescript
import { test, expect } from '@playwright/test';

test('uses built-in fixtures', async ({
  page,            // Browser page instance
  context,         // Browser context (isolated session)
  browser,         // Browser instance
  browserName,     // 'chromium', 'firefox', or 'webkit'
  request,         // API request context
}) => {
  // All fixtures are automatically created and cleaned up
});
```

### Custom Fixtures

```typescript
import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * Custom fixture type declarations.
 * Provides pre-initialized page objects to all tests.
 */
interface TestFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
}

/**
 * Extended test instance with custom fixtures.
 * Fixtures are lazily initialized — only created when used.
 */
export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  authenticatedPage: async ({ browser }, use) => {
    // Create a new context with saved auth state
    const context = await browser.newContext({
      storageState: './tests/fixtures/auth-state.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

// Usage in spec:
test('dashboard loads for authenticated user', async ({ dashboardPage }) => {
  await dashboardPage.goto('/dashboard');
  // ...assertions
});
```

### Test Data Factory

```typescript
// tests/utils/testDataFactory.ts

export interface TestUser {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'viewer' | 'editor';
}

/**
 * Generate a unique test user.
 * Uses timestamp for uniqueness across parallel test runs.
 */
export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  const id = Date.now();
  return {
    username: `testuser_${id}`,
    email: `test_${id}@example.com`,
    password: 'SecurePass123!',
    role: 'viewer',
    ...overrides,
  };
}

/**
 * Generate bulk test data for table/list testing.
 */
export function createTestUsers(count: number): TestUser[] {
  return Array.from({ length: count }, (_, i) =>
    createTestUser({ username: `user_${i}` })
  );
}
```

---

## Test Organization & Hooks

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature: User Management', () => {
  // Runs once before all tests in this describe
  test.beforeAll(async ({ browser }) => {
    // Heavy setup: seed database, etc.
  });

  // Runs before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
  });

  // Runs after each test
  test.afterEach(async ({ page }) => {
    // Cleanup if needed
  });

  // Runs once after all tests
  test.afterAll(async () => {
    // Teardown: clean database, etc.
  });

  // Nested describe for grouping
  test.describe('admin role', () => {
    test('can create a new user', async ({ page }) => {
      await page.getByRole('button', { name: 'Create User' }).click();
      // ...
    });

    test('can delete a user', async ({ page }) => {
      // ...
    });
  });

  test.describe('viewer role', () => {
    test('cannot see create button', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Create User' })).not.toBeVisible();
    });
  });
});

// --- Test annotations ---

// Skip a test
test.skip('feature not implemented yet', async ({ page }) => { });

// Mark as expected failure
test.fail('known bug #123', async ({ page }) => { });

// Slow test — triple the timeout
test.slow('data-heavy operation', async ({ page }) => { });

// Only run this test (focus)
test.only('debug this test', async ({ page }) => { });

// Conditional skip
test('windows only', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Not supported in Safari');
  // ...
});

// Tags
test('smoke test @smoke', async ({ page }) => { });
test('regression test @regression', async ({ page }) => { });
// Run: npx playwright test --grep @smoke
```

---

## Advanced Features

### Iframes

```typescript
// Access iframe content
const frame = page.frameLocator('#my-iframe');
await frame.getByRole('button', { name: 'Submit' }).click();
await expect(frame.getByText('Success')).toBeVisible();

// Nested iframes
const nestedFrame = page
  .frameLocator('#outer-iframe')
  .frameLocator('#inner-iframe');
await nestedFrame.getByRole('button').click();
```

### Shadow DOM

```typescript
// Playwright automatically pierces open shadow DOM
await page.locator('my-component').getByRole('button').click();

// Explicit shadow DOM access
await page.locator('my-component >> shadow=button.inner').click();
```

### Multiple Pages / Tabs

```typescript
// Handle new tab/popup
const pagePromise = page.context().waitForEvent('page');
await page.getByRole('link', { name: 'Open in new tab' }).click();
const newPage = await pagePromise;
await newPage.waitForLoadState();
await expect(newPage).toHaveTitle('New Page');
await newPage.close();
```

### Dialogs (Alert, Confirm, Prompt)

```typescript
// Auto-accept dialog
page.on('dialog', (dialog) => dialog.accept());

// Auto-dismiss dialog
page.on('dialog', (dialog) => dialog.dismiss());

// Assert dialog message and accept
page.once('dialog', async (dialog) => {
  expect(dialog.message()).toBe('Are you sure?');
  await dialog.accept();
});
await page.getByRole('button', { name: 'Delete' }).click();

// Respond to prompt dialog
page.once('dialog', (dialog) => dialog.accept('My answer'));
```

### Downloads

```typescript
// Wait for download and save
const downloadPromise = page.waitForEvent('download');
await page.getByRole('link', { name: 'Download Report' }).click();
const download = await downloadPromise;

// Save to specific path
await download.saveAs('./downloads/report.csv');

// Get download content as stream
const stream = await download.createReadStream();

// Get suggested filename
const filename = download.suggestedFilename();
```

### File Uploads

```typescript
// Standard file input
await page.getByLabel('Upload').setInputFiles('path/to/file.pdf');

// Multiple files
await page.getByLabel('Upload').setInputFiles([
  'file1.pdf',
  'file2.pdf',
]);

// Drag-and-drop upload (non-input)
const [fileChooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.getByTestId('dropzone').click(),
]);
await fileChooser.setFiles('file.pdf');
```

### Screenshots & Video

```typescript
// Full page screenshot
await page.screenshot({ path: 'screenshots/full.png', fullPage: true });

// Element screenshot
await page.getByTestId('chart').screenshot({ path: 'screenshots/chart.png' });

// Video is configured in playwright.config.ts
// Accessed via test info:
test('video example', async ({ page }, testInfo) => {
  // After test, video path is available
  const video = page.video();
  if (video) {
    const path = await video.path();
    testInfo.attach('video', { path, contentType: 'video/webm' });
  }
});
```

### Tracing

```typescript
// Traces are configured in playwright.config.ts (trace: 'on-first-retry')

// Manual trace control in test
test('traced test', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  await page.goto('/');
  // ... test steps

  await context.tracing.stop({ path: 'trace.zip' });
  // View: npx playwright show-trace trace.zip
});
```

### Emulation

```typescript
// Geolocation
const context = await browser.newContext({
  geolocation: { longitude: -73.935242, latitude: 40.730610 },
  permissions: ['geolocation'],
});

// Color scheme
const context2 = await browser.newContext({
  colorScheme: 'dark',  // 'light', 'dark', 'no-preference'
});

// Timezone
const context3 = await browser.newContext({
  timezoneId: 'America/New_York',
});

// Locale
const context4 = await browser.newContext({
  locale: 'de-DE',
});

// User agent
const context5 = await browser.newContext({
  userAgent: 'Custom User Agent String',
});

// Viewport
const context6 = await browser.newContext({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
});

// Offline mode
await context.setOffline(true);
```

---

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
test('should show order total after adding items', async ({ page }) => {
  // Arrange: Navigate and set up preconditions
  await page.goto('/shop');

  // Act: Perform the action under test
  await page.getByTestId('product-card').first().click();
  await page.getByRole('button', { name: 'Add to cart' }).click();

  // Assert: Verify the expected outcome
  await expect(page.getByTestId('cart-badge')).toHaveText('1');
  await expect(page.getByTestId('cart-total')).toContainText('$');
});
```

### Data-driven Testing

```typescript
const testCases = [
  { input: 'valid@email.com', valid: true, desc: 'valid email' },
  { input: 'no-at-sign', valid: false, desc: 'missing @' },
  { input: '', valid: false, desc: 'empty string' },
] as const;

for (const { input, valid, desc } of testCases) {
  test(`email validation: ${desc}`, async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Email').fill(input);
    await page.getByRole('button', { name: 'Submit' }).click();

    if (valid) {
      await expect(page.getByTestId('error')).not.toBeVisible();
    } else {
      await expect(page.getByTestId('error')).toBeVisible();
    }
  });
}
```

### Visual Regression Testing

```typescript
test('homepage visual snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01,
    fullPage: true,
  });
});

// Update snapshots: npx playwright test --update-snapshots
```

---

## CI/CD Integration

```yaml
# GitHub Actions
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Playwright Smoke Tests
  run: npx playwright test --grep @smoke

- name: Playwright Full Suite
  run: npx playwright test

# Run specific project (browser)
- name: Chrome Only
  run: npx playwright test --project=chromium

# Run with specific workers
- name: Parallel
  run: npx playwright test --workers=4

# Generate and upload report
- name: Upload Report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

### CLI Reference

```bash
# Run all tests
npx playwright test

# Run specific file
npx playwright test tests/e2e/auth/login.spec.ts

# Run by grep (title or tag)
npx playwright test --grep @smoke
npx playwright test --grep "login"
npx playwright test --grep-invert @slow

# Run specific project/browser
npx playwright test --project=chromium

# Debug mode (headed, paused)
npx playwright test --debug

# UI mode (interactive test runner)
npx playwright test --ui

# Generate tests (codegen)
npx playwright codegen http://localhost:3000

# Show trace viewer
npx playwright show-trace trace.zip

# Update visual snapshots
npx playwright test --update-snapshots

# List available tests
npx playwright test --list
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
| --- | --- |
| `await page.waitForTimeout(5000)` | Use auto-waiting locators and `expect` |
| `page.locator('.btn-primary')` | `page.getByRole('button', { name })` |
| Asserting inside page objects | Return locators, assert in specs |
| Sharing state between tests | Each test is fully isolated |
| Manual `page.waitForSelector` | Locators auto-wait; use `expect` for assertions |
| `page.evaluate` for simple clicks | Use locator actions: `.click()`, `.fill()` |
| `page.$()` / `page.$$()` | Use `page.locator()` (auto-waiting) |
| Testing 3rd-party auth UI | Use `storageState` or API auth |
| Hardcoded `sleep` for animations | `await expect(el).toBeVisible()` auto-retries |
