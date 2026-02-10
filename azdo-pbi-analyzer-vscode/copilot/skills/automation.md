# Skill: Automation Pseudo-code

## Purpose

Generate automation pseudo-code for smoke and critical test scenarios using
Cypress.io and Playwright.dev in JavaScript.

## Scope

- Only generate for scenarios tagged `smoke` or `critical`
- `non-regression` scenarios are excluded from automation pseudo-code

## Cypress.io Patterns

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  // @critical
  it('Test case title', () => {
    // Step 1: description
    // cy.get('SELECTOR').click();

    // Assertion: expected result
    // cy.get('SELECTOR').should('be.visible');
  });
});
```

### Key Cypress Commands

- `cy.visit(url)` — Navigate to page
- `cy.get(selector)` — Find element
- `cy.contains(text)` — Find by text content
- `cy.click()` — Click element
- `cy.type(text)` — Type into input
- `cy.should(assertion)` — Assert condition

## Playwright Patterns

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // @smoke
  test('Test case title', async ({ page }) => {
    // Step 1: description
    // await page.locator('SELECTOR').click();

    // Assertion: expected result
    // await expect(page.locator('SELECTOR')).toBeVisible();
  });
});
```

### Key Playwright Commands

- `page.goto(url)` — Navigate to page
- `page.locator(selector)` — Find element
- `page.getByRole(role, options)` — Find by ARIA role
- `page.getByText(text)` — Find by text
- `locator.click()` — Click element
- `locator.fill(text)` — Type into input
- `expect(locator).toBeVisible()` — Assert visibility

## Output Files

- `automated/cypress-pseudo.js` — Cypress pseudo-code
- `automated/playwright-pseudo.js` — Playwright pseudo-code
