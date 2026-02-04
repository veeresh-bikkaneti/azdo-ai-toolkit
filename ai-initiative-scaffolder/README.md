# AI Initiative Scaffolder

> **One-click scaffolding for AI-powered development workflows**

Instantly deploy the complete **AI Initiative Documentation Suite** into your workspace. This VS Code extension provides agents, skills, workflows, and OWASP-compliant security templates for Azure DevOps projects.

---

## 🚀 Quick Start (2 Minutes)

### Option 1: Install from VS Code Marketplace *(Coming Soon)*

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions)
3. Search for **"AI Initiative Scaffolder"**
4. Click **Install**

### Option 2: Install from `.vsix` (Local Testing)

```bash
# Download the .vsix file
code --install-extension ai-initiative-scaffolder-1.1.0.vsix
```

### Usage

1. Open your project in VS Code
2. Press `Ctrl+Shift+P` (Command Palette)
3. Type: **`AI Initiative: Initialize Docs`**
4. Verify in `AI_Initiative_Activity_Log.md`

**Result**: Your project now has:
- 📁 `AI_Initiative_Docs/` - Agent personas, architecture, OWASP guidelines
- 📁 `.agent/` - Preconfigured agents, skills, and workflows ready for use

---

## 📦 What Gets Installed

| Component | Description |
|-----------|-------------|
| **Agents** | 10+ specialized AI agents (Backend, Frontend, QA, Security, DevOps) |
| **Workflows** | `/pbi-to-automation`, `/brainstorm`, `/test`, `/deploy` |
| **Architecture Docs** | `ARCHITECTURE.md`, `GEMINI.md`, `OWASP_AI_SECURITY.md` |
| **Activity Log** | `AI_Initiative_Activity_Log.md` (local audit trail) |

---

## 🔒 Security & Privacy

> [!IMPORTANT]
> **This extension operates 100% LOCALLY.**

- ✅ **No Network Calls**: Zero `fetch`, `http`, or telemetry
- ✅ **Local Logging**: All actions logged to `AI_Initiative_Activity_Log.md`
- ✅ **Data Privacy**: Zero data upload. You own your logs.
- ✅ **Sanitization**: Automatically replaces placeholders with your project name

### Audit Verification

After installation, review the activity log:
```bash
cat AI_Initiative_Activity_Log.md
```

---

## 🧪 Testing & Development

### Run Extension Locally

```bash
# Clone the repo
git clone https://github.com/veeresh-bikkaneti/azdo-ai-toolkit
cd ai-initiative-scaffolder

# Install dependencies
npm install

# Open in VS Code
code .

# Press F5 to launch Extension Development Host
# Test the command: "AI Initiative: Initialize Docs"
```

### Package Extension

```bash
npm run package  # Creates dist/extension.js
vsce package     # Creates .vsix file
```

### Verification Checklist

- [ ] Extension activates without errors
- [ ] `AI_Initiative_Docs` folder created
- [ ] Activity log contains all operations
- [ ] No network requests (check browser DevTools)
- [ ] Works in new/existing workspaces

---

## 📤 Publishing to VS Code Marketplace

### Prerequisites

1. **Azure DevOps Account**: https://dev.azure.com
2. **Publisher Account**: https://marketplace.visualstudio.com/manage
3. **Personal Access Token (PAT)** with "Marketplace (Manage)" scope

### Step-by-Step Publishing

#### 1️⃣ Install Publishing Tool

```bash
npm install -g @vscode/vsce
```

#### 2️⃣ Create Publisher (First Time Only)

1. Go to: https://marketplace.visualstudio.com/manage
2. Click **"Create Publisher"**
3. Set **Publisher ID**: `veeresh-bikkaneti`

#### 3️⃣ Generate PAT Token

1. Go to: https://dev.azure.com/[your-org]/_usersSettings/tokens
2. Click **"New Token"**
3. Name: `vscode-marketplace`
4. Scopes: **Marketplace → Manage**
5. **Copy the token** (you won't see it again!)

#### 4️⃣ Update `package.json`

Ensure these fields are set:
```json
{
  "publisher": "veeresh-bikkaneti",
  "repository": {
    "type": "git",
    "url": "https://github.com/veeresh-bikkaneti/azdo-ai-toolkit"
  }
}
```

#### 5️⃣ Publish

```bash
cd ai-initiative-scaffolder

# Login (paste PAT when prompted)
vsce login veeresh-bikkaneti

# Publish to marketplace
vsce publish
```

**Alternative: Manual Upload**
```bash
# Package locally
vsce package

# Upload .vsix at:
# https://marketplace.visualstudio.com/manage/publishers/veeresh-bikkaneti
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not showing | Reload VS Code (`Ctrl+Shift+P` → "Reload Window") |
| Files not created | Check workspace opened (`File > Open Folder`) |
| Permission errors | Run VS Code as Administrator (Windows) |
| Extension not activating | Check Output panel (`View > Output`) |

---

## 📋 Requirements

- VS Code `^1.80.0` or higher
- Node.js `^20.0.0` (for development/testing)
- TypeScript `^5.0.0` (for development)

---

## 🤝 Contributing

This extension is part of the **AzDo AI Toolkit**. See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## 📜 License

MIT © Veeresh Bikkaneti

---

## 🔗 Links

- **Repository**: https://github.com/veeresh-bikkaneti/azdo-ai-toolkit
- **Marketplace**: *(Coming soon)*
- **Issues**: https://github.com/veeresh-bikkaneti/azdo-ai-toolkit/issues
