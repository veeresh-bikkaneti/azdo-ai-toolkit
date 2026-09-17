# AI Agents for PBI-to-Automation

This folder was installed by the **Azure DevOps PBI Analyzer** VS Code extension
(command: `Install AI Agents`). It contains the agent personas, skills, and
workflows the extension uses to turn Azure DevOps PBIs into tested, shippable
work. Drop it into any repo — the agents work with any AI coding assistant that
reads markdown agent files.

## Agents (`agents/`)

| Agent | Role |
|---|---|
| `orchestrator.md` | Routes work across the other agents |
| `product-owner.md` | Writes and refines user stories and acceptance criteria |
| `project-planner.md` | Breaks epics into planned, sequenced work |
| `test-architect.md` | Designs the testing strategy for a PBI |
| `qa-automation-engineer.md` | Writes Cypress/Playwright automation |
| `cypress-agent.md` | Cypress-specific test authoring |
| `playwright-agent.md` | Playwright-specific test authoring |
| `automation-architect.md` | Automation framework design |
| `backend-specialist.md` | API/backend implementation |
| `devops-engineer.md` | CI/CD pipelines and environments |
| `security-auditor.md` | Security review of code and tests |

## Workflows (`workflows/`)

- `analyze-pbi.md` — end-to-end flow: fetch a PBI, analyze it, generate test
  scenarios, Gherkin, and automation.
- `pbi-to-automation.md` — the fuller pipeline from story to automated proof.

## Skills (`skills/`)

- `story-analysis.md` — how to dissect a PBI (ambiguities, missing criteria)
- `test-planning.md` — how to build a test plan from acceptance criteria
- `automation.md` — automation authoring conventions

## Docs

- `ARCHITECTURE.md` — how the agents, skills, and workflows fit together.
