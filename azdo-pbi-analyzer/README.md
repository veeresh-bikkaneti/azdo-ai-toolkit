# Azure DevOps PBI Analyzer (Refactored)

A comprehensive tool for analyzing Product Backlog Items (PBIs) from Azure DevOps and generating test automation candidates.

> **Status**: Migrated to .NET 8.0. Now includes Deep Analysis (Impact & Regression) and Automation Candidate detection.

## 🔒 Security & Privacy Core

> [!IMPORTANT]
> **This tool operates 100% LOCALLY.**

*   **No Network Calls**: Use of `fetch` or `http` logic is restricted to Azure DevOps API calls (authenticated via your PAT). No other telemetry or external calls are made.
*   **Local Logging**: All analysis actions are logged transparently to `AzDo_PBI_Analyzer_Activity_Log.md` in the execution root.
*   **Data Privacy**: Analysis data stays on your machine. Reports are generated locally.

## 🎯 Features

- **PBI Analysis**: Parse Azure DevOps URLs (Work Items, Bugs, Features).
- **Deep Analysis**:
  - **Linked Items**: Scans Parent, Child, and Related items.
  - **Impact Analysis**: Identifies regression risks based on "Tested By" links.
  - **Smoke Candidates**: Auto-tags high-priority/critical items for Smoke testing.
- **Automation Ready**: Outputs standard reports ready for the `pbi-to-automation` workflow.
- **Cypress Integration**: Scaffolding for converting analysis to Cypress specs.

## 📋 Prerequisites

- .NET SDK 8.0 or higher
- Azure DevOps PAT (Personal Access Token) with "Work Items (Read)" permissions
- Node.js (for Cypress automation)

## 🚀 Installation

```bash
# Clone the repository
git clone <repo-url>
cd azdo-pbi-analyzer

# Build the project
dotnet build
```

## ⚙️ Configuration

**Security Best Practice**: Store your PAT in a `.env` file (never commit to git).

### Step 1: Create `.env` File

```bash
# Copy the example
cp .env.example .env

# Edit .env and add your PAT
# .env
AZURE_DEVOPS_PAT=your_personal_access_token_here
```

### Step 2: Generate Your PAT

1. Go to: https://dev.azure.com/{your-org}/_usersSettings/tokens
2. Click **"New Token"**
3. Name: `azdo-pbi-analyzer`
4. Scopes: **Work Items (Read)**
5. Copy the token and paste into `.env`

> [!IMPORTANT]
> The `.env` file is automatically ignored by git. Your PAT stays on your machine.

## 📖 Usage

### Analyze a PBI
```bash
dotnet run --project src/AzDoPbiAnalyzer.Cli -- --url "https://dev.azure.com/org/project/_workitems/edit/12345"
```

### Mock Mode (Try without API)
```bash
dotnet run --project src/AzDoPbiAnalyzer.Cli -- --url "mock" --mock
```

### Generate Report
```bash
dotnet run --project src/AzDoPbiAnalyzer.Cli -- --url "..." --output ./reports
```

## 🤖 Automation Workflow

1. **Analyze**: Run the tool to get the analysis report.
2. **Review**: Check "Regression Candidates" and "Smoke Candidates".
3. **Automate**: Use the `automation-architect` agent to scaffold Cypress tests.

   ```bash
   # Example Cypress scaffolding
   npx cypress open
   ```

## 🧪 Testing

Run unit tests:
```bash
dotnet test
```

## 📂 Project Structure

- `src/AzDoPbiAnalyzer.Core`: Core logic, Analyzers, Models.
- `src/AzDoPbiAnalyzer.Cli`: CLI entry point.
- `tests/AzDoPbiAnalyzer.Tests`: XUnit test suite.
- `cypress/`: Automation test project.

## 🤝 Contributing

See `.agent/agents` for specialized AI agents that assist with this project.
