# Azure DevOps PBI Analyzer

> **AI-powered PBI analysis with automated test generation**

Analyze Azure DevOps Product Backlog Items and automatically generate test scenarios, Gherkin specifications, and Cypress tests directly in VS Code.

---

## 🚀 Features

- **🔍 PBI Analysis**: Connect to Azure DevOps and analyze PBIs in real-time
- **🧪 Test Scenario Generation**: Auto-generate comprehensive test scenarios from acceptance criteria
- **🥒 Gherkin Specs**: Create BDD-style Gherkin feature files
- **🌲 Cypress Tests**: Generate ready-to-use Cypress test code
- **🔒 Secure**: PAT securely stored in VS Code (never leaves your machine)
- **🎨 Beautiful UI**: Modern webview interface with syntax highlighting

---

## 📦 Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions)
3. Search for **"Azure DevOps PBI Analyzer"**
4. Click **Install**

---

## 🎯 Quick Start

### Step 1: Open Analyzer Panel

Press `Ctrl+Shift+P` and type:
```
Azure DevOps: Open Analyzer Panel
```

Or use the shortcut command:
```
Azure DevOps: Analyze PBI
```

### Step 2: Enter PBI URL

Paste your Azure DevOps PBI URL:
```
https://dev.azure.com/yourorg/yourproject/_workitems/edit/12345
```

### Step 3: Enter PAT

Enter your Personal Access Token (PAT).

> **Security Note**: Your PAT is stored securely in VS Code's SecretStorage and never leaves your local machine.

### Step 4: Analyze

Click **"Analyze PBI"** and wait for the magic! ✨

---

## 📋 What You Get

### PBI Details
- Work item title, description, and acceptance criteria
- Linked items and relationships

### Test Scenarios
- Auto-generated test cases for each acceptance criterion
- Step-by-step test instructions
- Expected results

### Gherkin Specifications
- Complete Feature files with Scenarios
- Given-When-Then format
- Copy-paste ready

### Cypress Tests
- Fully functional Cypress test code
- Modern best practices (data-testid selectors)
- Ready to add to your test suite

---

## 🔐 Setting Up Azure DevOps PAT

1. Go to https://dev.azure.com/[your-org]/_usersSettings/tokens
2. Click **"New Token"**
3. Name: `vscode-pbi-analyzer`
4. Scopes: **Work Items → Read**
5. Click **Create**
6. **Copy the token** (you won't see it again!)
7. Paste it into the extension when prompted

---

## 🛠️ Configuration

You can set a default organization in VS Code settings:

```json
{
  "azdoPbiAnalyzer.organization": "https://dev.azure.com/yourorg"
}
```

---

## 🧪 Example Output

### Input
PBI: "As a user, I want to log in with my credentials"

### Generated Gherkin
```gherkin
Feature: User Login

Scenario: Successful login with valid credentials
  Given the user is on the login page
  When the user enters valid credentials
  And clicks the login button
  Then the user should be redirected to the dashboard
```

### Generated Cypress
```javascript
describe('User Login', () => {
  it('should login successfully with valid credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="username"]').type('validuser');
    cy.get('[data-testid="password"]').type('validpass');
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

---

## 🔒 Security & Privacy

> [!IMPORTANT]
> **All data processing happens locally in VS Code.**

- ✅ **Secure PAT Storage**: Uses VS Code SecretStorage API
- ✅ **No Cloud Processing**: All analysis runs locally
- ✅ **HTTPS Only**: All Azure DevOps API calls use HTTPS
- ✅ **No Telemetry**: Zero data collection

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid PAT" | Verify PAT has Work Items → Read permission |
| "PBI not found" | Check PBI URL format and verify access |
| Panel not opening | Reload VS Code window (`Ctrl+Shift+P` → "Reload Window") |
| Analysis taking long | Large PBIs with many linked items may take longer |

---

## 📚 Related Extensions

- **AI Initiative Scaffolder** - Documentation and agent scaffolding
- **GitHub Copilot** - AI-assisted coding
- **Azure DevOps** - Official Azure DevOps extension

---

## 🤝 Contributing

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/veeresh-bikkaneti/azdo-ai-toolkit/issues)!

---

## 📜 License

MIT © RUN Technology Consulting Services LLC

---

## 🔗 Links

- **Repository**: https://github.com/veeresh-bikkaneti/azdo-ai-toolkit
- **Issues**: https://github.com/veeresh-bikkaneti/azdo-ai-toolkit/issues
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

## ⭐ Enjoy!

If this extension helps you, consider giving it a ⭐ on the marketplace!
