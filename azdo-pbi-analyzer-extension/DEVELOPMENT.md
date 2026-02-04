# Development Guide

This guide is for developers who want to test, modify, or publish the AI Initiative Scaffolder extension.

---

## 🧪 Local Development

### Prerequisites

- Node.js `^20.0.0`
- VS Code `^1.80.0`
- TypeScript `^5.0.0`

### Setup

```bash
# Clone the repo
git clone https://github.com/veeresh-bikkaneti/azdo-ai-toolkit
cd ai-initiative-scaffolder

# Install dependencies
npm install

# Open in VS Code
code .
```

### Testing

#### Option 1: Extension Development Host

1. Press `F5` (or Run > Start Debugging)
2. A new VS Code window opens (Extension Development Host)
3. Open the Command Palette (`Ctrl+Shift+P`)
4. Run: **`AI Initiative: Initialize Docs`**
5. Verify files created and activity log populated

#### Option 2: Install .vsix Locally

```bash
# Package the extension
npm run package
vsce package

# Install locally
code --install-extension ai-initiative-scaffolder-1.1.0.vsix
```

### Verification Checklist

- [ ] Extension activates without errors
- [ ] `AI_Initiative_Docs` folder created
- [ ] Activity log contains all operations
- [ ] No network requests (check browser DevTools)
- [ ] Works in new/existing workspaces

---

## 📤 Publishing to Marketplace

### Prerequisites

1. **Publisher Account**: https://marketplace.visualstudio.com/manage
2. **Personal Access Token (PAT)** with "Marketplace (Manage)" scope (optional for CLI)

### Method 1: Manual Upload (Recommended)

```bash
# Package the extension
vsce package

# Upload manually at:
# https://marketplace.visualstudio.com/manage/publishers/RUNTechnologyConsultingServicesLLC
```

**Steps**:
1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with Microsoft account
3. Click **"New extension"** → **"Visual Studio Code"**
4. Upload `ai-initiative-scaffolder-1.1.0.vsix`

### Method 2: CLI Publishing (Requires PAT)

#### 1️⃣ Install Publishing Tool

```bash
npm install -g @vscode/vsce
```

#### 2️⃣ Generate PAT Token (First Time Only)

1. Go to: https://dev.azure.com/[your-org]/_usersSettings/tokens
2. Click **"New Token"**
3. Name: `vscode-marketplace`
4. Scopes: **Marketplace → Manage**
5. **Copy the token**

#### 3️⃣ Login & Publish

```bash
# Login (paste PAT when prompted)
vsce login RUNTechnologyConsultingServicesLLC

# Publish to marketplace
vsce publish
```

---

## 🔧 Build Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-recompile on changes)
npm run watch

# Package for production
npm run package

# Create .vsix
vsce package
```

---

## 📝 Before Publishing Checklist

- [ ] Version bumped in `package.json`
- [ ] README.md updated (user-facing only)
- [ ] CHANGELOG.md updated with changes
- [ ] Tested in Extension Development Host
- [ ] Tested as installed .vsix
- [ ] No security warnings
- [ ] Publisher ID matches marketplace account

---

## 🛠️ Project Structure

```
ai-initiative-scaffolder/
├── src/
│   └── extension.ts       # Main extension logic
├── templates/             # AI Initiative docs to copy
│   ├── Agent_*.md
│   ├── ARCHITECTURE.md
│   └── ...
├── dist/                  # Compiled output
├── package.json           # Extension manifest
├── README.md              # User-facing (marketplace)
├── DEVELOPMENT.md         # This file
└── TESTING.md             # Detailed testing guide
```

---

## 🔍 Debugging

### Extension Not Activating

1. Check Output panel: `View > Output` → "AI Initiative Scaffolder"
2. Look for errors in Developer Tools: `Help > Toggle Developer Tools`

### Files Not Created

1. Verify workspace is opened (not just files)
2. Check file permissions
3. Review activity log for errors

---

## 📚 Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Testing Guide](./TESTING.md)

---

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
