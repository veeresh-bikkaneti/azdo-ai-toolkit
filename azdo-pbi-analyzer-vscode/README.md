# Azure DevOps PBI Analyzer

Analyze Azure DevOps Product Backlog Items (PBIs) to generate test scenarios, Gherkin specifications, Cypress/Playwright tests, and comprehensive gap analysis using AI-powered agent orchestration.

## ✨ Features

- 🔄 **Deep Analysis**: Recursively fetch work items with full hierarchy (parents, children, dependencies)
- 🧠 **AI-Driven Gap Analysis**: Detect missing NFRs, contradictions, edge cases, and integration gaps
- 🎭 **Multi-Persona QA Analysis**: Copilot Chat with 6 QA personas
- 🤖 **27 AI Agents**: Install expert agents for testing, architecture, debugging, and more
- 📝 **Auto-Generated Tests**: Gherkin, Cypress, Playwright, and Manual test cases

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
   #file:.agent/agents/qa-engineer.md
   
   Create test cases for: [Your PBI]
   ```

3. **OR Copy-Paste to Any AI**:
   - Open `.agent/agents/qa-engineer.md`
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
@azdo /analyze

[Your PBI details]
```

---

## 🤖 Available AI Agents (27 Total)

**QA Specialists**:
- 🧠 Critical Thinker - Requirements analysis, assumption identification
- 🎭 QA Orchestrator - Coordinates personas, synthesizes insights
- 🧪 QA Engineer - Test case design, functional testing
- 🏗️ QA Architect - Testing strategy, framework selection
- 🔍 Manual Tester - Exploratory testing, UX validation
- ⚙️ Automation Engineer - Test automation, CI/CD integration

**Development Specialists**:
- 🎨 Frontend Specialist - UI/UX, React, TypeScript
- 🔧 Backend Specialist - APIs, databases, architecture
- 📱 Mobile Developer - iOS, Android, React Native
- 🛡️ Security Auditor - Vulnerability scanning, compliance
- 🐛 Debugger - Root cause analysis, troubleshooting
- 📊 Database Architect - Schema design, optimization

**... and 15 more!** See `.agent/agents/` folder.

---

## 🛠️ Alternative Usage (No Extension Required)

### For VS Code Users (GitHub Copilot)

**In Copilot Chat**:
```
#file:.agent/agents/critical-thinker.md

Analyze this PBI:
"Users can reset password securely"
```

### For ChatGPT / Claude / Gemini Users

1. Open `.agent/agents/critical-thinker.md`
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

**Step 1**: Copy `.agent/agents/qa-engineer.md` content

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

**Settings** (`Ctrl+,`):
- `Azure DevOps PBI Analyzer: Organization` - Default org URL

**Azure DevOps PAT**:
- Required for API access
- Scopes: Work Items (Read)
- Stored securely in VS Code Secret Storage

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
