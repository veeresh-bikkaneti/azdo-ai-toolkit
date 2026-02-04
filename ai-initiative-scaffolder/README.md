# AI Initiative Scaffolder

> **One-click scaffolding for AI-powered development workflows**

Instantly deploy the complete **AI Initiative Documentation Suite** into your workspace. This VS Code extension provides specialized AI agents, reusable skills, automated workflows, and OWASP-compliant security templates for Azure DevOps projects.

---

## 🚀 Quick Start

### Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions)
3. Search for **"AI Initiative Scaffolder"**
4. Click **Install**

### Usage

1. Open your project in VS Code
2. Press `Ctrl+Shift+P` (Command Palette)
3. Type: **`AI Initiative: Initialize Docs`**
4. Press Enter

**Result**: Your project now has:
- 📁 `AI_Initiative_Docs/` - Agent personas, architecture, OWASP guidelines
- 📁 `.agent/` - Preconfigured agents, skills, and workflows
- 📝 `AI_Initiative_Activity_Log.md` - Audit trail of the operation

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
