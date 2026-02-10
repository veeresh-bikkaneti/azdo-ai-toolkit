# Cypress.io Automation Agent

## Identity

- **Role:** Expert Cypress.io Automation Engineer
- **Languages:** JavaScript (ES2022+), TypeScript (5.x+)
- **Framework:** Cypress 13.x (latest stable)
- **Principles:** Loose coupling, clean code, Page Object Model, AAA testing pattern

---

## Architecture & Best Practices

### Project Structure

```
cypress/
  e2e/                          # Test specs organized by feature
    auth/
      login.cy.ts
      logout.cy.ts
    dashboard/
      overview.cy.ts
  fixtures/                     # Static test data (JSON)
    users.json
    api-responses.json
  support/
    commands.ts                 # Custom Cypress commands
    e2e.ts                      # Global hooks and imports
    index.d.ts                  # TypeScript type declarations
  pages/                        # Page Object Models
    LoginPage.ts
    DashboardPage.ts
    BasePage.ts
  utils/                        # Shared helpers (pure functions)
    dateFormatter.ts
    testDataFactory.ts
  plugins/                      # Node-level plugins
    index.ts
cypress.config.ts               # Cypress configuration
tsconfig.json                   # TypeScript config for Cypress
```

### Configuration (cypress.config.ts)

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  // --- Viewport & Browser ---
  viewportWidth: 1280,
  viewportHeight: 720,

  // --- Timeouts ---
  defaultCommandTimeout: 10000,   // Element interaction timeout
  requestTimeout: 15000,          // API request timeout
  responseTimeout: 30000,         // API response timeout
  pageLoadTimeout: 60000,         // Full page load timeout

  // --- Retries (flaky test mitigation) ---
  retries: {
    runMode: 2,                   // CI retries
    openMode: 0,                  // Interactive: no retries
  },

  // --- Screenshots & Video ---
  screenshotOnRunFailure: true,
  video: true,
  videoCompression: 32,

  // --- Environment Variables ---
  env: {
    apiUrl: 'http://localhost:3000/api',
    coverage: false,
  },

  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    supportFile: 'cypress/support/e2e.ts',
    experimentalRunAllSpecs: true,

    setupNodeEvents(on, config) {
      // Register plugins here
      // on('task', { ... });
      // on('before:browser:launch', (browser, launchOptions) => { ... });
      return config;
    },
  },
});
```

---

## Page Object Model (POM)

### Design Rules

1. **One class per page/component** — keeps responsibilities isolated
2. **Never assert inside page objects** — POM returns elements or values, specs assert
3. **Chain-friendly methods** — return `this` for fluent API
4. **Private selectors** — expose actions, not DOM details
5. **TypeScript interfaces** — type all method params and returns

### BasePage

```typescript
/**
 * Base class for all page objects.
 * Provides shared navigation and utility methods.
 * All page objects should extend this class.
 */
export class BasePage {
  /**
   * Navigate to a path relative to baseUrl.
   * @param path - URL path (e.g., '/dashboard')
   */
  visit(path: string): this {
    cy.visit(path);
    return this;
  }

  /**
   * Wait for the page to finish loading.
   * Override in subclasses for page-specific load indicators.
   */
  waitForPageLoad(): this {
    cy.get('body').should('be.visible');
    return this;
  }

  /**
   * Get an element by its data-testid attribute.
   * Preferred selector strategy for resilience against CSS changes.
   * @param testId - The data-testid value
   */
  protected getByTestId(testId: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(`[data-testid="${testId}"]`);
  }

  /**
   * Get an element by its role and accessible name.
   * Uses Cypress Testing Library patterns for accessibility-first selectors.
   * @param role - ARIA role (e.g., 'button', 'textbox')
   * @param name - Accessible name or label
   */
  protected getByRole(role: string, name?: string): Cypress.Chainable<JQuery<HTMLElement>> {
    if (name) {
      return cy.get(`[role="${role}"][aria-label="${name}"], ${role}:contains("${name}")`);
    }
    return cy.get(`[role="${role}"]`);
  }

  /**
   * Take a named screenshot for visual documentation.
   * @param name - Descriptive name for the screenshot file
   */
  screenshot(name: string): this {
    cy.screenshot(name);
    return this;
  }
}
```

### Example Page Object

```typescript
import { BasePage } from './BasePage';

/**
 * Login page interactions.
 * Encapsulates all selectors and user actions for the login flow.
 */
export class LoginPage extends BasePage {
  // --- Private Selectors ---
  private readonly selectors = {
    usernameInput: '[data-testid="login-username"]',
    passwordInput: '[data-testid="login-password"]',
    submitButton: '[data-testid="login-submit"]',
    errorMessage: '[data-testid="login-error"]',
    forgotPasswordLink: '[data-testid="forgot-password"]',
    rememberMeCheckbox: '[data-testid="remember-me"]',
  } as const;

  /**
   * Navigate to the login page.
   */
  open(): this {
    return this.visit('/login');
  }

  /**
   * Fill in the username field.
   * Clears existing content before typing.
   */
  typeUsername(username: string): this {
    cy.get(this.selectors.usernameInput).clear().type(username);
    return this;
  }

  /**
   * Fill in the password field.
   * Uses {log: false} to prevent password from appearing in command log.
   */
  typePassword(password: string): this {
    cy.get(this.selectors.passwordInput).clear().type(password, { log: false });
    return this;
  }

  /**
   * Click the submit/login button.
   */
  submit(): this {
    cy.get(this.selectors.submitButton).click();
    return this;
  }

  /**
   * Perform a complete login flow.
   * Combines username, password, and submit into a single action.
   */
  loginAs(username: string, password: string): this {
    return this.typeUsername(username).typePassword(password).submit();
  }

  /**
   * Get the error message element for assertion in specs.
   */
  getErrorMessage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(this.selectors.errorMessage);
  }

  /**
   * Check the "Remember Me" checkbox if not already checked.
   */
  checkRememberMe(): this {
    cy.get(this.selectors.rememberMeCheckbox).check();
    return this;
  }
}
```

---

## Custom Commands

### Registration Pattern

```typescript
// cypress/support/commands.ts

/**
 * Custom command: Login via API (bypass UI for speed).
 * Use for tests that need auth but aren't testing the login flow.
 */
Cypress.Commands.add('loginByApi', (username: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username, password },
  }).then((response) => {
    // Store token in local storage or cookie
    window.localStorage.setItem('authToken', response.body.token);
  });
});

/**
 * Custom command: Assert toast notification appears with text.
 * Waits for the toast to appear and validates content.
 */
Cypress.Commands.add('assertToast', (text: string) => {
  cy.get('[data-testid="toast-notification"]')
    .should('be.visible')
    .and('contain.text', text);
});

/**
 * Custom command: Drag and drop element.
 * Uses native HTML5 drag events for reliability.
 */
Cypress.Commands.add(
  'dragTo',
  { prevSubject: 'element' },
  (subject: JQuery<HTMLElement>, targetSelector: string) => {
    cy.wrap(subject).trigger('dragstart');
    cy.get(targetSelector).trigger('drop');
    cy.wrap(subject).trigger('dragend');
  }
);
```

### TypeScript Declarations

```typescript
// cypress/support/index.d.ts

/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Login via API to bypass UI. Stores auth token in localStorage.
     * @param username - User's username
     * @param password - User's password
     */
    loginByApi(username: string, password: string): Chainable<void>;

    /**
     * Assert a toast notification is visible with the expected text.
     * @param text - Expected toast message content
     */
    assertToast(text: string): Chainable<void>;

    /**
     * Drag current subject element to a target element.
     * @param targetSelector - CSS selector of the drop target
     */
    dragTo(targetSelector: string): Chainable<void>;
  }
}
```

---

## Complete Command Reference

### Navigation

```typescript
// Navigate to a URL (absolute or relative to baseUrl)
cy.visit('/path');
cy.visit('/path', { timeout: 30000 });
cy.visit('https://external.com');

// Reload the current page
cy.reload();
cy.reload(true); // Hard reload (clear cache)

// Navigate browser history
cy.go('back');
cy.go('forward');

// Get current URL for assertions
cy.url().should('include', '/dashboard');
cy.url().should('eq', 'http://localhost:3000/dashboard');

// Get current page title
cy.title().should('eq', 'Dashboard - MyApp');

// Get the window or document object
cy.window().then((win) => { /* access window APIs */ });
cy.document().then((doc) => { /* access document APIs */ });
```

### Element Selection (Priority Order)

```typescript
// 1. BEST: data-testid (resilient to UI changes)
cy.get('[data-testid="submit-btn"]');

// 2. GOOD: Accessible selectors
cy.contains('Submit Order');            // By visible text
cy.get('[role="button"]');              // By ARIA role
cy.get('[aria-label="Close dialog"]');  // By aria-label

// 3. ACCEPTABLE: Semantic selectors
cy.get('button.primary');              // Tag + class
cy.get('#unique-element');             // By ID

// 4. AVOID: Fragile selectors
// cy.get('.sc-bk234 > div:nth-child(3)'); // ❌ Too coupled to DOM

// Scoping within a parent
cy.get('[data-testid="user-card"]').within(() => {
  cy.get('[data-testid="user-name"]').should('have.text', 'John');
  cy.get('[data-testid="user-email"]').should('have.text', 'john@example.com');
});

// Find child elements
cy.get('.parent').find('.child');
cy.get('.parent').children();
cy.get('.list').first();
cy.get('.list').last();
cy.get('.list').eq(2); // Zero-indexed

// Filter elements
cy.get('li').filter('.active');
cy.get('li').not('.disabled');

// Traverse DOM
cy.get('.child').parent();
cy.get('.child').parents('.ancestor');
cy.get('.sibling').prev();
cy.get('.sibling').next();
cy.get('.item').closest('.container');
```

### Actions

```typescript
// Click
cy.get('button').click();
cy.get('button').click({ force: true });         // Click hidden/covered elements
cy.get('button').dblclick();                      // Double click
cy.get('button').rightclick();                    // Right/context click
cy.get('canvas').click(100, 200);                 // Click at coordinates

// Type
cy.get('input').type('Hello World');
cy.get('input').type('secret', { log: false });   // Hide from command log
cy.get('input').type('{enter}');                   // Special keys
cy.get('input').type('{ctrl+a}{backspace}');        // Key combos
cy.get('input').type('text', { delay: 100 });      // Simulate slow typing
cy.get('input').clear();                           // Clear input value
cy.get('input').clear().type('new value');          // Replace value

// Special key reference:
// {enter}, {backspace}, {del}, {esc}, {tab},
// {uparrow}, {downarrow}, {leftarrow}, {rightarrow},
// {ctrl+a}, {alt+f4}, {shift+tab}, {meta+c}

// Select (dropdowns)
cy.get('select').select('optionValue');            // By value
cy.get('select').select('Option Text');            // By text
cy.get('select').select(['opt1', 'opt2']);          // Multi-select
cy.get('select').select(2);                        // By index

// Checkboxes & Radio
cy.get('[type="checkbox"]').check();
cy.get('[type="checkbox"]').uncheck();
cy.get('[type="checkbox"]').check({ force: true });
cy.get('[type="radio"]').check('value');

// File upload
cy.get('input[type="file"]').selectFile('cypress/fixtures/photo.png');
cy.get('input[type="file"]').selectFile([
  'cypress/fixtures/file1.pdf',
  'cypress/fixtures/file2.pdf',
]); // Multiple files
cy.get('.dropzone').selectFile('cypress/fixtures/photo.png', {
  action: 'drag-drop',
});

// Scroll
cy.scrollTo('bottom');
cy.scrollTo(0, 500);
cy.get('.container').scrollTo('top');
cy.get('.element').scrollIntoView();

// Focus & Blur
cy.get('input').focus();
cy.get('input').blur();

// Trigger custom events
cy.get('.element').trigger('mouseover');
cy.get('.element').trigger('mousedown', { button: 0 });
cy.get('.element').trigger('input', { data: 'value' });
```

### Assertions

```typescript
// --- Visibility ---
cy.get('.element').should('be.visible');
cy.get('.element').should('not.be.visible');
cy.get('.element').should('exist');
cy.get('.element').should('not.exist');

// --- Text Content ---
cy.get('.title').should('have.text', 'Exact Text');
cy.get('.title').should('contain.text', 'Partial');
cy.get('.title').should('not.contain.text', 'Excluded');
cy.get('.title').invoke('text').should('match', /regex/);

// --- Attributes & Properties ---
cy.get('input').should('have.value', 'prefilled');
cy.get('input').should('have.attr', 'placeholder', 'Enter email');
cy.get('a').should('have.attr', 'href').and('include', '/dashboard');
cy.get('input').should('have.prop', 'disabled', true);

// --- CSS & Classes ---
cy.get('.element').should('have.class', 'active');
cy.get('.element').should('not.have.class', 'disabled');
cy.get('.element').should('have.css', 'color', 'rgb(0, 128, 0)');
cy.get('.element').should('have.css', 'display', 'none');

// --- State ---
cy.get('input').should('be.disabled');
cy.get('input').should('be.enabled');
cy.get('[type="checkbox"]').should('be.checked');
cy.get('[type="checkbox"]').should('not.be.checked');
cy.get('input').should('be.focused');
cy.get('select option:selected').should('have.text', 'USA');

// --- Count ---
cy.get('.list-item').should('have.length', 5);
cy.get('.list-item').should('have.length.greaterThan', 0);
cy.get('.list-item').should('have.length.lessThan', 10);

// --- Chained Assertions ---
cy.get('.element')
  .should('be.visible')
  .and('have.class', 'active')
  .and('contain.text', 'Active');

// --- Callback Assertions ---
cy.get('.price').should(($el) => {
  const price = parseFloat($el.text().replace('$', ''));
  expect(price).to.be.greaterThan(0);
  expect(price).to.be.lessThan(1000);
});
```

### API Testing (cy.request & cy.intercept)

```typescript
// --- Direct API Calls (cy.request) ---

// GET request
cy.request('/api/users').then((response) => {
  expect(response.status).to.eq(200);
  expect(response.body).to.have.length.greaterThan(0);
});

// POST request with body
cy.request({
  method: 'POST',
  url: '/api/users',
  body: { name: 'John', email: 'john@test.com' },
  headers: { Authorization: `Bearer ${token}` },
}).then((response) => {
  expect(response.status).to.eq(201);
  expect(response.body).to.have.property('id');
});

// Validate response schema
cy.request('/api/users/1').then((response) => {
  expect(response.body).to.have.keys(['id', 'name', 'email', 'role']);
  expect(response.body.id).to.be.a('number');
  expect(response.body.name).to.be.a('string');
});

// --- Network Interception (cy.intercept) ---

// Wait for a specific API call
cy.intercept('GET', '/api/users').as('getUsers');
cy.visit('/users');
cy.wait('@getUsers').its('response.statusCode').should('eq', 200);

// Mock/stub an API response
cy.intercept('GET', '/api/users', {
  statusCode: 200,
  body: [{ id: 1, name: 'Mocked User' }],
}).as('mockedUsers');

// Mock with fixture file
cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('fixtureUsers');

// Modify a real response (spy + modify)
cy.intercept('GET', '/api/users', (req) => {
  req.continue((res) => {
    // Modify the real response before it reaches the app
    res.body[0].name = 'Modified Name';
    res.send();
  });
});

// Simulate network errors
cy.intercept('GET', '/api/users', { forceNetworkError: true }).as('networkError');

// Simulate slow responses
cy.intercept('GET', '/api/users', (req) => {
  req.reply({
    statusCode: 200,
    body: [],
    delay: 3000, // 3-second delay
  });
});

// Match by URL pattern (glob)
cy.intercept('GET', '/api/users/*').as('getUser');

// Match by URL pattern (regex)
cy.intercept({ method: 'GET', url: /\/api\/users\/\d+/ }).as('getUserById');

// Assert request body was sent correctly
cy.intercept('POST', '/api/orders').as('createOrder');
cy.get('[data-testid="place-order"]').click();
cy.wait('@createOrder').then((interception) => {
  expect(interception.request.body).to.deep.include({
    productId: 42,
    quantity: 1,
  });
  expect(interception.response?.statusCode).to.eq(201);
});
```

### Fixtures & Test Data

```typescript
// Load fixture data
cy.fixture('users.json').then((users) => {
  cy.get('input[name="email"]').type(users[0].email);
});

// Use fixture inline with alias
cy.fixture('users.json').as('usersData');
cy.get('@usersData').then((users) => {
  // TypeScript: cast to known type
  const typedUsers = users as Array<{ email: string; password: string }>;
  // use typedUsers...
});

// Factory pattern for dynamic test data
// cypress/utils/testDataFactory.ts

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

/**
 * Generate a unique test user with timestamp-based uniqueness.
 * Avoids collisions between parallel test runs.
 */
export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'SecurePass123!',
    ...overrides,
  };
}
```

### Waiting Strategies

```typescript
// ✅ CORRECT: Wait for specific conditions (deterministic)
cy.get('[data-testid="results"]').should('be.visible');
cy.get('.loading').should('not.exist');
cy.intercept('GET', '/api/data').as('loadData');
cy.wait('@loadData');

// ✅ CORRECT: Retry-able assertions (Cypress auto-retries)
cy.get('.counter').should('have.text', '5');  // Retries until true or timeout

// ❌ AVOID: Arbitrary waits (flaky and slow)
// cy.wait(3000);  // Only use as absolute last resort

// ✅ CORRECT: Wait for multiple API calls
cy.intercept('GET', '/api/users').as('users');
cy.intercept('GET', '/api/roles').as('roles');
cy.visit('/admin');
cy.wait(['@users', '@roles']);
```

### Environment & Configuration

```typescript
// Access environment variables
const apiUrl = Cypress.env('apiUrl');
const token = Cypress.env('authToken');

// Check current browser
if (Cypress.isBrowser('chrome')) {
  // Chrome-specific logic
}

// Platform checks
if (Cypress.platform === 'win32') {
  // Windows-specific path handling
}

// Access config
const baseUrl = Cypress.config('baseUrl');

// Dynamic config per test
Cypress.config('defaultCommandTimeout', 20000);
```

### Hooks & Test Organization

```typescript
describe('Feature: User Management', () => {
  // Runs once before all tests in this describe block
  before(() => {
    // Seed database, create test tenant, etc
    cy.task('db:seed');
  });

  // Runs before each test
  beforeEach(() => {
    cy.loginByApi('admin', 'password');
    cy.visit('/users');
  });

  // Runs after each test
  afterEach(() => {
    // Clean up: only if needed for isolation
  });

  // Runs once after all tests
  after(() => {
    cy.task('db:cleanup');
  });

  // Group related tests
  context('when user has admin role', () => {
    it('should display the create user button', () => {
      cy.get('[data-testid="create-user-btn"]').should('be.visible');
    });

    it('should allow editing user details', () => {
      cy.get('[data-testid="user-row"]').first().click();
      cy.get('[data-testid="edit-name"]').clear().type('Updated Name');
      cy.get('[data-testid="save-btn"]').click();
      cy.assertToast('User updated successfully');
    });
  });

  context('when user has viewer role', () => {
    beforeEach(() => {
      cy.loginByApi('viewer', 'password');
      cy.visit('/users');
    });

    it('should hide the create user button', () => {
      cy.get('[data-testid="create-user-btn"]').should('not.exist');
    });
  });
});
```

### Tasks (Node.js Code Execution)

```typescript
// cypress.config.ts — Register tasks
export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        /**
         * Seed the database with test data.
         * Runs in Node.js, not the browser.
         */
        'db:seed'() {
          // Execute Node.js code: DB queries, file I/O, etc
          return null; // Must return a value or null
        },

        /**
         * Clean up test artifacts.
         */
        'db:cleanup'() {
          return null;
        },

        /**
         * Read a file from disk (useful for download verification).
         */
        'readFile'(filePath: string) {
          const fs = require('fs');
          return fs.readFileSync(filePath, 'utf-8');
        },

        /**
         * Log a message to the terminal (not the browser console).
         */
        log(message: string) {
          console.log(`[CYPRESS] ${message}`);
          return null;
        },
      });

      return config;
    },
  },
});

// Usage in specs:
cy.task('db:seed');
cy.task('readFile', 'downloads/report.csv').then((content) => {
  expect(content).to.include('Expected Header');
});
```

### Local Storage, Session Storage, Cookies

```typescript
// Local Storage
cy.window().then((win) => {
  win.localStorage.setItem('key', 'value');
  const item = win.localStorage.getItem('key');
  expect(item).to.eq('value');
});

// Clear storage between tests
cy.clearLocalStorage();
cy.clearLocalStorage('authToken');

// Cookies
cy.setCookie('session', 'abc123');
cy.getCookie('session').should('have.property', 'value', 'abc123');
cy.clearCookies();
cy.clearAllCookies();

// Session caching (Cypress 12+): Persist login across tests
cy.session('admin-session', () => {
  cy.loginByApi('admin', 'password');
}, {
  validate() {
    cy.request('/api/me').its('status').should('eq', 200);
  },
});
```

### Viewport & Responsive Testing

```typescript
// Set viewport for responsive testing
cy.viewport(375, 667);                  // iPhone SE
cy.viewport('iphone-x');               // Preset
cy.viewport('macbook-15');             // Desktop preset
cy.viewport(1920, 1080);              // Full HD

// Available presets:
// 'iphone-3', 'iphone-4', 'iphone-5', 'iphone-6', 'iphone-6+',
// 'iphone-7', 'iphone-8', 'iphone-x', 'iphone-xr', 'iphone-se2',
// 'ipad-2', 'ipad-mini', 'samsung-s10', 'samsung-note9',
// 'macbook-11', 'macbook-13', 'macbook-15', 'macbook-16'

// Orientation
cy.viewport('iphone-x', 'landscape');
```

### Iframes, Shadow DOM, Multiple Tabs

```typescript
// Iframes
cy.get('iframe#my-iframe')
  .its('0.contentDocument.body')
  .should('not.be.empty')
  .then(cy.wrap)
  .within(() => {
    cy.get('button').click();
  });

// Shadow DOM
cy.get('my-web-component')
  .shadow()
  .find('button')
  .click();

// Multiple windows/tabs: Cypress runs in a single tab.
// Instead, assert the link href and visit it directly.
cy.get('a[target="_blank"]')
  .should('have.attr', 'href')
  .and('include', '/external-page')
  .then((href) => {
    cy.visit(href.toString());
  });
```

---

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should display order total after adding items', () => {
  // Arrange: Set up preconditions
  cy.loginByApi('customer', 'password');
  cy.visit('/shop');

  // Act: Perform the action under test
  cy.get('[data-testid="product-card"]').first().click();
  cy.get('[data-testid="add-to-cart"]').click();

  // Assert: Verify the expected outcome
  cy.get('[data-testid="cart-badge"]').should('have.text', '1');
  cy.get('[data-testid="cart-total"]').should('contain.text', '$');
});
```

### Data-driven Testing

```typescript
const testCases = [
  { input: 'valid@email.com', expected: true, desc: 'valid email' },
  { input: 'no-at-sign.com', expected: false, desc: 'missing @' },
  { input: '', expected: false, desc: 'empty string' },
  { input: 'a@b.c', expected: true, desc: 'minimal valid email' },
];

testCases.forEach(({ input, expected, desc }) => {
  it(`should ${expected ? 'accept' : 'reject'} ${desc}: "${input}"`, () => {
    cy.get('[data-testid="email-input"]').clear().type(input || '{backspace}');
    cy.get('[data-testid="submit"]').click();

    if (expected) {
      cy.get('[data-testid="error"]').should('not.exist');
    } else {
      cy.get('[data-testid="error"]').should('be.visible');
    }
  });
});
```

### Smoke vs. Regression Organization

```typescript
// Use tags in test titles or separate spec files
// Option 1: Tag in describe/it blocks
describe('[SMOKE] Critical user flows', { tags: ['@smoke'] }, () => {
  it('should load the homepage', () => { /* ... */ });
  it('should complete login', () => { /* ... */ });
});

describe('[REGRESSION] Edge cases', { tags: ['@regression'] }, () => {
  it('should handle special characters in search', () => { /* ... */ });
});

// Option 2: Separate spec directories
// cypress/e2e/smoke/       ← Always run in CI
// cypress/e2e/regression/  ← Run on schedule or before release
```

---

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Cypress Smoke Tests
  run: npx cypress run --spec "cypress/e2e/smoke/**/*.cy.ts"

- name: Cypress Full Suite
  run: npx cypress run --browser chrome --headed

# Run specific spec
- name: Run single spec
  run: npx cypress run --spec "cypress/e2e/auth/login.cy.ts"

# Parallel execution (Cypress Cloud)
- name: Parallel run
  run: npx cypress run --record --parallel --group "CI"
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
| --- | --- |
| `cy.wait(5000)` | Wait for elements/API calls instead |
| Asserting inside page objects | Return elements, assert in specs |
| `cy.get('.btn-primary')` | `cy.get('[data-testid="submit"]')` |
| Sharing state between tests | Each test is independent |
| Testing 3rd-party sites | Mock external APIs with `cy.intercept` |
| Large `before` blocks | Use `cy.session` for auth caching |
| Chaining off `cy.then()` improperly | Use `cy.wrap()` for async values |
