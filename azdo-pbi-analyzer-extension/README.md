# AI Initiative Scaffolder

> **One-click AI documentation deployment for your development projects**

Instantly deploy the complete **AI Initiative Documentation Suite** into your workspace. This VS Code extension provides specialized AI agents, reusable skills, automated workflows, and architecture templates to supercharge your AI-assisted development workflow.

---

## 🚀 Quick Start

### Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions)
3. Search for **"AI Initiative Scaffolder"**
4. Click **Install**

### Usage

#### Step 1: Run the Extension

1. Open your project in VS Code (`File > Open Folder`)
2. Press `Ctrl+Shift+P` (Command Palette)
3. Type: **`AI Initiative: Initialize Docs`**
4. Press Enter

**What happens**:
- Creates `AI_Initiative_Docs/` folder with templates
- Creates `.agent/` folder with agents, skills, workflows
- Logs all operations to `AI_Initiative_Activity_Log.md`

#### Step 2: Use the Installed Workflows

**The extension installs workflows, but doesn't run them.** You use workflows by asking your AI coding assistant (GitHub Copilot, Gemini, Claude, etc.).

**Examples**:

| You Say | What Happens |
|---------|--------------|
| `@workspace /pbi-to-automation` | Runs PBI to automation workflow |
| `@workspace /brainstorm` | Structured brainstorming session |
| `@workspace /test` | Generates test cases for your code |
| `@workspace /orchestrate` | Coordinates multiple AI agents |

**Available Workflows** (after installation):
```
.agent/workflows/
├── pbi-to-automation.md
├── brainstorm.md
├── test.md
├── deploy.md
├── orchestrate.md
└── ... (12 total)
```

#### Step 3: Verify Installation

Check that files were created:
```bash
ls AI_Initiative_Docs/
ls .agent/
cat AI_Initiative_Activity_Log.md
```

Expected output:
- ✅ 16 files in `AI_Initiative_Docs/`
- ✅ Agents, skills, workflows in `.agent/`
- ✅ Activity log with timestamps

---

## 📦 What Gets Installed

| Component | Description |
|-----------|-------------|
| **Agents** | 10+ specialized AI agents (Backend, Frontend, QA, Security, DevOps, Product Owner) |
| **Workflows** | `/pbi-to-automation`, `/brainstorm`, `/test`, `/deploy`, `/orchestrate` |
| **Architecture Docs** | `ARCHITECTURE.md`, `GEMINI.md`, `OWASP_AI_SECURITY.md` |
| **Activity Log** | Local audit trail of all extension operations |

---

## 🔒 Security & Privacy

> [!IMPORTANT]
> **This extension operates 100% LOCALLY.**

- ✅ **No Network Calls**: Zero `fetch`, `http`, or telemetry
- ✅ **Local Logging**: All actions logged to `AI_Initiative_Activity_Log.md`
- ✅ **Data Privacy**: Zero data upload. You own your logs.
- ✅ **Auto-Sanitization**: Replaces placeholders with your project name

### Audit Verification

After installation, review the activity log:
```bash
cat AI_Initiative_Activity_Log.md
```

Expected entries:
- File copy operations
- Template sanitization
- Timestamp of each action

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not showing | Reload VS Code (`Ctrl+Shift+P` → "Reload Window") |
| Files not created | Ensure workspace is opened (`File > Open Folder`) |
| Permission errors | Run VS Code as Administrator (Windows) |
| Extension not activating | Check Output panel (`View > Output` → "AI Initiative Scaffolder") |

---

## ❓ Frequently Asked Questions

### Why don't "/" slash commands work in the Command Palette?

**Slash commands (`/pbi-to-automation`, `/brainstorm`, etc.) are NOT VS Code commands.**

They are **workflow instructions** for your AI coding assistant (GitHub Copilot, Gemini, Claude, etc.).

**How to use them**:
1. This extension installs the workflow files to `.agent/workflows/`
2. Your AI assistant reads those files when you reference them
3. Example: Type `@workspace /pbi-to-automation` in your AI chat

**This extension only does the installation.** The workflows are then used by AI assistants that have access to your workspace files.

### Do I need to run this extension multiple times?

No. Run it **once per project**. If you've already run it, the extension will log "already exists" messages.

### Can I customize the installed files?

Yes! After installation:
- Edit agents in `AI_Initiative_Docs/Agent_*.md`
- Modify workflows in `.agent/workflows/`
- Add your own skills to `.agent/skills/`

Changes persist in your project.

---

## 📋 Requirements

- VS Code `^1.80.0` or higher

---

## 🤝 Contributing

This extension is part of the **AzDo AI Toolkit**. For development instructions, see [DEVELOPMENT.md](https://github.com/veeresh-bikkaneti/azdo-ai-toolkit/blob/main/ai-initiative-scaffolder/DEVELOPMENT.md).

---

## 📜 License

MIT © RUN Technology Consulting Services LLC

---

## 🔗 Links

- **Repository**: https://github.com/veeresh-bikkaneti/azdo-ai-toolkit
- **Issues**: https://github.com/veeresh-bikkaneti/azdo-ai-toolkit/issues
- **Documentation**: [Full Guide](https://github.com/veeresh-bikkaneti/azdo-ai-toolkit/tree/main/ai-initiative-scaffolder)
