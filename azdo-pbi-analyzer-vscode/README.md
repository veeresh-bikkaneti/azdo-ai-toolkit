# Azure DevOps PBI Analyzer

Analyze Azure DevOps Product Backlog Items (PBIs) to generate test scenarios, Gherkin specifications, Cypress/Playwright tests, and comprehensive gap analysis using AI-powered agent orchestration.

## ✨ Features

- 🔄 **Deep Analysis**: Recursively fetch work items with full hierarchy (parents, children, dependencies)
- 🧠 **AI-Driven Gap Analysis**: Detect missing NFRs, contradictions, edge cases, and integration gaps
- 🎭 **Multi-Persona QA Analysis**: Chat (`@azdo.pbi-analyst`) with 6 QA personas, powered by your choice of AI provider
- 🤖 **11 AI Agents**: Install expert agents, skills, and workflows for testing, architecture, and automation
- 📝 **Auto-Generated Tests**: Gherkin, Cypress, Playwright, and Manual test cases

## 🧠 AI Providers

The chat personas can stream real answers from your AI provider of choice.
Configure it in VS Code settings (`Ctrl+,` → search "PBI Analyzer"):

| Setting | Values | Notes |
|---------|--------|-------|
| `azdoPbiAnalyzer.aiEnabled` | `true` / `false` | Master switch (default `true`) |
| `azdoPbiAnalyzer.aiProvider` | `vscode`, `openai-compatible`, `anthropic`, `gemini` | Default `vscode` |
| `azdoPbiAnalyzer.aiModel` | e.g. `gpt-4o-mini`, `claude-sonnet-4-5` | Optional; provider default when blank |
| `azdoPbiAnalyzer.aiEndpoint` | Custom base URL | Required for self-hosted endpoints |

- **`vscode`** — uses VS Code's built-in language models (e.g. Copilot). No API key needed.
- **`openai-compatible`** — any OpenAI-style chat-completions endpoint: OpenAI, Azure OpenAI (deployment URL), Ollama, LM Studio, OpenRouter, Together, DeepSeek, and more. Set the base URL in `aiEndpoint`.
- **`anthropic`** — Claude Messages API (`https://api.anthropic.com` by default).
- **`gemini`** — Google Generative Language API.

API keys are stored in VS Code Secret Storage (never in settings files):

- Command palette → `Azure DevOps: Set AI Provider API Key`
- Command palette → `Azure DevOps: Clear AI Provider API Key`

With no provider or key configured, personas fall back to built-in heuristic
analysis, so chat always responds.

---

## 🚀 Quick Start

### Option 1: Use the VS Code Extension

1. **Install Extension** from VS Code Marketplace
2. **Analyze a PBI**:
   - Press `Ctrl+Shift+P`
   - Run: `QA the PBI`
   - Enter PBI URL: `https://dev.azure.com/org/project/_workitems/edit/12345`
3. **View Analysis** with deep hierarchy and AI-generated questions

### Option 2: Use AI Agents Directly (No Extension Needed!)

**Works with ANY AI model (ChatGPT Free, Claude, Gemini, etc.)**

1. **Install Agents**:
   - Press `Ctrl+Shift+P`
   - Run: `Azure DevOps: Install AI Agents and Workflows`
   - **OR** manually copy `.agent` folder to workspace

2. **Use with GitHub Copilot** (Free or Paid):
   ```
   #file:.agent/agents/qa-automation-engineer.md
   
   Create test cases for: [Your PBI]
   ```

3. **OR Copy-Paste to Any AI**:
   - Open `.agent/agents/qa-automation-engineer.md`
   - Copy entire content
   - Paste into ChatGPT/Claude/Gemini
   - Add your question below

📖 **Full Guide**: See [`.agent/HOW_TO_USE.md`](.agent/HOW_TO_USE.md) for detailed instructions

---

## 🎭 Copilot Chat Commands

**Chat Participant**: `@azdo.pbi-analyst`

| Command | Description |
|---------|-------------|
| `/analyze` | Full multi-persona orchestration (all QA personas) |
| `/critical-review` | Critical thinking analysis (assumptions, gaps, risks) |
| `/qa-engineer` | Test case design and coverage analysis |
| `/qa-architect` | Testing strategy and framework recommendations |
| `/manual-test` | Exploratory testing and UX focus |
| `/automation` | Test automation strategy and implementation |

**Example**:
```
@azdo.pbi-analyst /analyze

[Your PBI details]
```

**Tip**: analyze a PBI in the panel first (`QA the PBI`) — the chat
participant picks up that PBI automatically, so the personas answer about
*your* work item instead of asking you to paste it again.

Personas stream answers from your configured AI provider (see
[AI Providers](#-ai-providers) below). With no provider configured, they fall
back to built-in heuristic analysis so they always produce something useful.

---

## 🤖 Available AI Agents (11 Total)

Run `Azure DevOps: Install AI Agents and Workflows` to drop a ready-to-use
`.agent/` folder into your workspace (agents, skills, workflows, docs).

**QA Specialists**:
- 🧠 Test Architect - Testing strategy, PBI analysis, automation planning
- 🎭 Orchestrator - Routes work across the other agents
- 🧪 QA Automation Engineer - Test automation design and implementation
- 🌲 Cypress Agent - Cypress-specific test authoring
- 🎭 Playwright Agent - Playwright-specific test authoring

**Delivery Specialists**:
- 📝 Product Owner - User stories and acceptance criteria
- 📊 Project Planner - Breaking epics into sequenced work
- 🏗️ Automation Architect - Automation framework design
- 🔧 Backend Specialist - APIs and backend implementation
- 🛠️ DevOps Engineer - CI/CD pipelines and environments
- 🛡️ Security Auditor - Security review of code and tests

**Also included**: 3 skills (`story-analysis`, `test-planning`, `automation`),
2 workflows (`analyze-pbi`, `pbi-to-automation`), and `ARCHITECTURE.md`.

---

## 🛠️ Alternative Usage (No Extension Required)

### For VS Code Users (GitHub Copilot)

**In Copilot Chat**:
```
#file:.agent/agents/test-architect.md

Analyze this PBI:
"Users can reset password securely"
```

### For ChatGPT / Claude / Gemini Users

1. Open `.agent/agents/test-architect.md`
2. Copy all content
3. Paste into AI chat
4. Add your question

**No VS Code needed! No installation needed! Works with FREE AI models!**

---

## 📋 What Gets Analyzed?

**Deep Work Item Hierarchy**:
- ✅ Parent chain (Epic → Feature → Grandparent)
- ✅ Children (Tasks, Bugs, Sub-tasks)
- ✅ Dependencies (Related items)

**Enhanced Gap Analysis**:
- 🔒 Security requirements missing?
- ⚡ Performance targets undefined?
- ♿ Accessibility not mentioned?
- 🚨 Error handling gaps?
- ✔️ Validation missing?
- 📊 Logging/monitoring absent?
- 🧪 Edge cases not covered?
- 🔗 Integration timeout/retry strategy?

**Auto-Generated Artifacts**:
- Test scenarios (Positive, Negative, Edge cases)
- Gherkin specifications
- Cypress test pseudocode
- Playwright test pseudocode
- Manual test cases (step-by-step)

---

## 📖 Documentation

- 📘 [Beginner's Guide to AI Agents](.agent/HOW_TO_USE.md) - **START HERE!**
- 🏗️ [Agent Architecture](.agent/ARCHITECTURE.md)
- 🔄 [Workflows](.agent/workflows/)
- 🎭 [All Agents](.agent/agents/)

---

## 💡 Examples

### Example 1: GitHub Copilot Chat

```
@azdo /analyze

PBI: "Implement OAuth2 login for mobile app"

Acceptance Criteria:
- Users can log in with Google and Facebook
- Session persists for 30 days
- Token refresh happens automatically
```

**AI orchestrates**:
- Critical Thinker → Identifies PKCE compliance gap
- QA Engineer → Creates 12 test scenarios
- QA Architect → Recommends Playwright + Detox
- Automation Engineer → 80% automation target

---

### Example 2: Using Agents with ChatGPT Free

**Step 1**: Copy `.agent/agents/qa-automation-engineer.md` content

**Step 2**: Paste into ChatGPT:
```
[Pasted QA Engineer agent prompt]

Create test cases for:
Feature: Shopping cart checkout
- User adds items
- Applies discount code
- Completes payment
```

**Step 3**: Get expert test cases with Given/When/Then format!

---

## 🆓 Works with Free AI Models - No Quality Compromise

**These agent prompts are engineered for free models.** Get professional, expert-level results without paid subscriptions.

✅ **GitHub Copilot Free** - ⭐⭐⭐⭐⭐ Excellent
✅ **ChatGPT Free** (GPT-4o mini) - ⭐⭐⭐⭐⭐ Excellent
✅ **Claude Free** - ⭐⭐⭐⭐⭐ Excellent
✅ **Gemini Free** - ⭐⭐⭐⭐ Very Good

### Why Quality Is Identical:

Each agent prompt includes:
- ✅ Complete frameworks (self-contained, no external knowledge needed)
- ✅ Structured templates (free models follow them perfectly)
- ✅ Concrete examples (guides output format)
- ✅ Quality checklists (built-in validation)

**Result**: Free models produce the same expert-level analysis as paid models. The structured prompts compensate for any capability differences.

📖 **Optimization Guide**: [`.agent/FREE_MODELS_GUIDE.md`](.agent/FREE_MODELS_GUIDE.md)

---

## 🔧 Configuration

**Settings** (`Ctrl+,`, search "PBI Analyzer"):
- `azdoPbiAnalyzer.organization` - Default org URL (lets you paste a bare work-item ID)
- `azdoPbiAnalyzer.aiEnabled` - Master switch for AI-powered chat personas
- `azdoPbiAnalyzer.aiProvider` - `vscode` (default) | `openai-compatible` | `anthropic` | `gemini`
- `azdoPbiAnalyzer.aiModel` - Model name override (optional)
- `azdoPbiAnalyzer.aiEndpoint` - Custom base URL for `openai-compatible` (e.g. Ollama, Azure OpenAI)

**Azure DevOps PAT**:
- Required for API access
- Scopes: Work Items (Read)
- Resolution order: panel input → VS Code Secret Storage → `AZDO_PAT` in workspace `.env`
- Stored securely in VS Code Secret Storage. Prefer the panel input / Secret Storage over `.env` — a plaintext `.env` is the least-secure option and should be gitignored.

## 🔒 Security

This extension follows the OWASP guidance in this repo's `AI_Initiative_Docs/OWASP_AI_SECURITY.md`:

- **Secrets stay secret.** PATs and API keys live in VS Code Secret Storage (OS keychain). Error messages never include credentials, and transport errors are scrubbed of `Basic`/`Bearer` material before display.
- **AI data sharing is opt-in.** The first time an AI persona would send your PBI's content to a model endpoint, the extension asks for consent (dismissible, remembered). Declining falls back to the offline rule-based heuristics.
- **Prompt-injection boundaries (LLM01).** PBI text and your questions are treated as untrusted *data*: they are wrapped in explicit `"""` delimiters and the system prompt instructs the model never to follow instructions embedded in them.
- **Timeouts (LLM04).** AI provider requests time out after 60s; Azure DevOps calls after 30s. A hung endpoint can't wedge the extension.
- **Typed failures.** Expired PATs (401/403), bad work-item IDs (404), timeouts, and network errors surface as distinct, actionable messages instead of one generic error.
- **Webview hardening (LLM02).** The results webview runs under a restrictive Content Security Policy, validates incoming messages, and AI-generated content is never executed — only rendered as Markdown/text.

---

## 📦 Installation

### From VS Code Marketplace

1. Search "Azure DevOps PBI Analyzer"
2. Click Install

### From `.vsix` File

```bash
code --install-extension azdo-pbi-analyzer-1.0.3.vsix
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

## 🎯 Key Takeaway

**You DON'T need the extension to use the AI agents!**

The 27 expert agents work with:
- ✅ GitHub Copilot (Free or Paid)
- ✅ ChatGPT Free
- ✅ Claude Free
- ✅ Any other AI model

Just copy-paste or use `#file:` references in Copilot Chat!

📘 **Get Started**: Read [`.agent/HOW_TO_USE.md`](.agent/HOW_TO_USE.md)
