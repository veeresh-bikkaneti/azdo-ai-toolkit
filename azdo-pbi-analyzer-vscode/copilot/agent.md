# PBI Analyzer Agent Configuration

## Agent Metadata

- **Name:** pbi-analyzer
- **Display Name:** Azure DevOps PBI Analyzer
- **Version:** 1.0.0
- **Type:** copilot-extension
- **Compatibility:** VS Code GitHub Copilot Chat

## Activation

- **Trigger:** `@pbi-analyzer` in Copilot Chat or via Command Palette
- **Commands:**
  - `analyzePbi` — Analyze a PBI by URL
  - `openPanel` — Open the analyzer webview panel

## Configuration

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `azdoPbiAnalyzer.organization` | string | `""` | Default Azure DevOps org URL |
| `AZDO_PAT` (.env) | string | — | Personal Access Token for AzDO API |

## PAT Resolution Order

1. User-provided input (stored in VS Code secrets)
2. `.env` file in workspace root (`AZDO_PAT=xxx`)
3. VS Code secrets store (previously saved)

## Skills Reference

| Skill | File | Purpose |
| --- | --- | --- |
| Story Analysis | `skills/story-analysis.md` | TPO-style PBI review |
| Test Planning | `skills/test-planning.md` | Manual test case generation |
| Automation | `skills/automation.md` | Cypress + Playwright pseudo-code |

## Workflows

| Workflow | File | Purpose |
| --- | --- | --- |
| Analyze PBI | `workflows/analyze-pbi.md` | End-to-end PBI analysis flow |
