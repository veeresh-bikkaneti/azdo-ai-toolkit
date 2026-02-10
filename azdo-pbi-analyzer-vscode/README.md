# 🚀 Azure DevOps PBI Analyzer

> **Your AI-Powered Assistant for Better Requirements & Automated Tests**

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 👋 What is this?

**Writing tests is hard.** Converting abstract requirements into concrete test code is even harder. 

The **Azure DevOps PBI Analyzer** solves this by connecting directly to your Azure DevOps board, reading your User Stories (PBIs), and using AI to automatically generate:
1.  **Missing Acceptance Criteria**: Finds gaps in your requirements.
2.  **Gherkin Scenarios**: Writes BDD-style "Given/When/Then" specs for you.
3.  **Cypress Code**: Writes the actual automation code to test those scenarios.

It's like having a Senior QA Engineer paired with you, instantly writing the boilerplate code so you can focus on the logic.

---

## 🏁 Quick Start Guide

Follow these steps to generate your first test suite in under 2 minutes.

### Step 1: Open the Analyzer
1.  Open VS Code.
2.  Press `Ctrl+Shift+P` (Command Palette).
3.  Type **"QA the PBI"** and press Enter.

### Step 2: Connect to Azure DevOps
*Note: You only need to do this once.*

1.  Go to your Azure DevOps **User Settings** (top right icon) -> **Personal Access Tokens**.
2.  Click **New Token**.
    - **Name**: `VSCode Analyzer`
    - **Scopes**: Scroll down to **Work Items** and select **Read**.
3.  Click **Create** and copy the long string of characters.
4.  Paste this token into the **"Personal Access Token (PAT)"** field in the extension panel.

> 🔒 **Security First**: Your token is stored in VS Code's secure Secret Storage. It never leaves your machine.

### Step 3: Analyze a PBI
1.  Copy the URL of a specific PBI or Bug from your board.
    - *Example*: `https://dev.azure.com/myorg/myproject/_workitems/edit/54321`
2.  Paste it into the **"PBI URL or ID"** field.
3.  Click **Analyze PBI**.

---

## 🧠 Capabilities Walkthrough

Once you click "Analyze", the tool generates three tabs of results:

### Tab 1: 📋 Analysis & Gaps
This section reviews the quality of your requirement itself.
- **Summary**: A quick digest of what the PBI is asking for.
- **Gap Analysis**: AI checks if you missed edge cases (e.g., "What happens if the user has no permissions?", "What if the API times out?").

### Tab 2: 🥒 Gherkin Specifications
This tab generates human-readable behavior specs.
- **Format**: Standard Gherkin (`.feature` file format).
- **Usage**: Copy this content into a new file in your project, e.g., `specs/login.feature`.

**Example Output**:
```gherkin
Feature: User Login

Scenario: Successful login with valid credentials
  Given the user is on the login page
  When the user enters valid credentials
  And clicks the login button
  Then the user should be redirected to the dashboard
```

### Tab 3: 🌲 Cypress Test Code
This tab generates the actual TypeScript code for Cypress.
- **Best Practices**: Uses `data-testid` selectors for stability.
- **Structure**: Follows `describe` / `it` block patterns.
- **Usage**: Copy this into your Cypress `e2e` folder, e.g., `cypress/e2e/login_spec.ts`.

**Example Output**:
```typescript
describe('User Login', () => {
    it('should login successfully', () => {
        cy.visit('/login');
        cy.get('[data-testid="username"]').type('testuser');
        // ...
    });
});
```

---

## ⚙️ Configuration

You can save your Organization URL so you don't have to verify it every time.

1.  Open VS Code Settings (`Ctrl+,`).
2.  Search for `azdo`.
3.  Set **Azdo Pbi Analyzer: Organization** to your base URL (e.g., `https://dev.azure.com/mycompany`).

---

## 🐞 Troubleshooting

**"Invalid PAT" Error**
- Ensure your token didn't expire.
- Verify you selected "Work Items > Read" scope when creating it.

**"PBI not found"**
- Ensure you copied the *full* URL, including the ID.
- Check if you have permissions to view that specific project.

---

## 🆘 Troubleshooting & Alternative Path

If the extension is unavailable or you need a quick alternative, you can use **ANY** AI tool (ChatGPT, Claude, Gemini) to manually generate the same results.

### Manual Workaround: Copy-Paste Prompt

1.  Copy the **System Prompt** below.
2.  Paste it into your AI chat window.
3.  Paste your PBI content (Title, Description, Acceptance Criteria) right after it.

<details>
<summary>📋 <strong>Click to Expand System Prompt</strong></summary>

```markdown
You are an expert QA Automation Engineer and Product Owner.
Your goal is to analyze the following Product Backlog Item (PBI) and generate detailed Quality Assurance artifacts.

Input:
[PASTE YOUR PBI CONTENT HERE]

Output Required:
1.  **Gap Analysis**: Identify missing acceptance criteria or edge cases.
2.  **Gherkin Scenarios**: Write BDD scenarios (Given/When/Then) covering positive, negative, and edge cases.
3.  **Cypress Code**: meaningful, robust Cypress tests using `data-testid` selectors.
4.  **Manual Test Cases (CSV format)**: Create a CSV-compatible list for Azure DevOps import with columns: ID, Work Item Type, Title, Test Step, Step Action, Step Expected.
```

</details>

---

See [DEVELOPER.md](DEVELOPER.md) for detailed instructions on building, running, and contributing to this project.

---

**Happy Testing!** 🚀
