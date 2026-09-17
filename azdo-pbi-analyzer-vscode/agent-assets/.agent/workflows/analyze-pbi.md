---
description: End-to-end PBI analysis workflow
---

# Analyze PBI Workflow

## Prerequisites

- Azure DevOps PAT configured (`.env` or VS Code secrets)
- Workspace folder open in VS Code

## Steps

### 1. Input Collection

Collect the PBI URL from the user.

- Accept format: `https://dev.azure.com/{org}/{project}/_workitems/edit/{id}`
- Also supports: `https://{org}.visualstudio.com/{project}/_workitems/edit/{id}`

### 2. PAT Resolution

Resolve the Personal Access Token:

1. Check user-provided input
2. Check `.env` file for `AZDO_PAT`
3. Check VS Code secrets store
4. Error if none found

### 3. Fetch PBI Data

// turbo

- Fetch the work item via Azure DevOps REST API
- Expand relations to get linked items
- Fetch parent epic/feature (hierarchy-reverse relation)
- Fetch up to 10 related work items

### 4. Analyze Requirements

// turbo

- Strip HTML from description and acceptance criteria
- Parse acceptance criteria into individual items
- Assign tags (smoke/critical/non-regression) based on keywords
- Generate questions for vague or missing information
- Map flows for developer and test engineer perspectives

### 5. Generate Artifacts

// turbo

- **Story Analysis** → `pbi/{id}/story-analysis.md`
- **Manual Test Cases** → `pbi/{id}/manual-test-cases.md`
- **Gherkin Spec** → `pbi/{id}/gherkin-spec.feature`
- **Cypress Pseudo-code** → `pbi/{id}/automated/cypress-pseudo.js`
- **Playwright Pseudo-code** → `pbi/{id}/automated/playwright-pseudo.js`

### 6. Output

// turbo

- Save all artifacts to workspace under `pbi/{id}/`
- Display summary in webview panel
- Show VS Code notification with output path

## Error Handling

| Error | Resolution |
| --- | --- |
| Invalid PBI URL | Show format example, ask user to retry |
| PAT missing | Guide user to add `AZDO_PAT` to `.env` |
| Work item not found | Verify ID and project, check permissions |
| API rate limit | Wait and retry with backoff |
