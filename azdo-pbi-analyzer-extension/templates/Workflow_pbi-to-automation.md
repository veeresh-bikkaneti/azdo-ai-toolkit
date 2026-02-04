---
description: Workflow to convert PBI requirements into Cypress automation code.
---

# PBI to Automation Workflow

1. **Analyze PBI**: Use `azdo-pbi-analyzer` to get the JSON/Markdown report.
   ```bash
   dotnet run --project src/AzDoPbiAnalyzer.Cli -- --url <PBI_URL> --output ./analysis
   ```

2. **Review Candidates**: Check the "Automation Recommendations" section of the report.

3. **Scaffold Tests**:
   - For each "Automation Ready" test case:
     - Create a new spec file `cypress/e2e/[Feature]/[PBI-ID]-[Scenario].cy.ts`.
     - Implement the test structure using `it('should ...')`.

4. **Map Selectors**:
   - Identify UI elements required.
   - Update/Create Page Objects in `cypress/support/pages`.

5. **Verify**:
   - Run the new spec in headless mode.
   - `npx cypress run --spec "cypress/e2e/path/to/spec.cy.ts"`

