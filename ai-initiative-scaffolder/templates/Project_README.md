# Azure DevOps PBI Analyzer (Refactored)

A comprehensive tool for analyzing Product Backlog Items (PBIs) from Azure DevOps and generating test automation candidates.

> **Status**: Migrated to .NET 8.0. Now includes Deep Analysis (Impact & Regression) and Automation Candidate detection.

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

Set your PAT in the environment or pass it via CLI:

```powershell
$env:AZURE_DEVOPS_PAT="your_pat_token"
```

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

