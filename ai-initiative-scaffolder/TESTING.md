# Extension Testing Guide

This document provides comprehensive testing instructions for the **AI Initiative Scaffolder** VS Code extension.

---

## Test Types

### 1. Manual Testing (Extension Development Host)

**Purpose**: Verify core functionality in a controlled environment.

#### Steps

```bash
# 1. Clone and setup
git clone https://github.com/veeresh-bikkaneti/azdo-ai-toolkit
cd ai-initiative-scaffolder
npm install

# 2. Open in VS Code
code .

# 3. Launch Extension Development Host
# Press F5 (or Run > Start Debugging)
```

**Test Scenarios**:

| Scenario | Expected Result |
|----------|-----------------|
| Run command in empty folder | Creates `AI_Initiative_Docs` + activity log |
| Run command in existing project | Scaffolds without overwriting existing files |
| Check activity log | Contains timestamped operations |
| Verify file sanitization | Project name replaced in templates |
| Run command twice | Second run logs "already exists" messages |

---

### 2. .vsix Installation Testing

**Purpose**: Test the packaged extension as end-users will install it.

```bash
# Package the extension
npm run package
vsce package

# Install locally
code --install-extension ai-initiative-scaffolder-1.1.0.vsix

# Verify in VS Code
# 1. Open Command Palette (Ctrl+Shift+P)
# 2. Search: "AI Initiative: Initialize Docs"
# 3. Execute and verify output
```

**Verification Checklist**:
- [ ] Command appears in palette
- [ ] Extension icon shows in Extensions view
- [ ] Activity log created
- [ ] All template files copied correctly

---

### 3. Security Testing

**Purpose**: Ensure the extension makes zero network calls (100% local operation).

#### Tools

- **Chrome DevTools**: Monitor network activity
- **VS Code Output Panel**: Check for errors

#### Test Protocol

```bash
# 1. Open VS Code with DevTools
code --inspect-extensions=9333

# 2. Open Chrome at: chrome://inspect
# 3. Click "inspect" next to Extension Host
# 4. Go to Network tab
# 5. Run: "AI Initiative: Initialize Docs"
# 6. Verify: Zero network requests
```

**Expected**:
- ✅ **0 network requests**
- ✅ All operations in activity log
- ✅ No external API calls

---

### 4. Cross-Platform Testing

**Purpose**: Ensure compatibility across Windows, macOS, Linux.

| Platform | Node.js | VS Code | Status |
|----------|---------|---------|--------|
| Windows 11 | 20.x | 1.80+ | ✅ Tested |
| macOS 13+ | 20.x | 1.80+ | 🟡 Manual test required |
| Ubuntu 22.04 | 20.x | 1.80+ | 🟡 Manual test required |

---

### 5. Regression Testing

**Purpose**: Prevent breaking changes when updating templates.

#### Automated Test (Future)

```typescript
// tests/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Command registration', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('aiInitiative.scaffold'));
    });

    test('Activity log creation', async () => {
        // Mock workspace
        // Execute command
        // Verify log exists
    });
});
```

---

## Quality Gates

Before publishing, all must pass:

- [ ] **Manual Tests**: All scenarios pass
- [ ] **Security Audit**: Zero network calls confirmed
- [ ] **Package Integrity**: `.vsix` installs without errors
- [ ] **Documentation**: README accurate and complete
- [ ] **Activity Log**: All operations logged correctly
- [ ] **Cross-Platform**: Works on at least 2 OSes

---

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Command not found | Extension not activated | Reload window (Ctrl+R) |
| Files not created | No workspace open | `File > Open Folder` first |
| Activity log empty | File write permission | Check folder permissions |
| Extension crashes | Missing dependencies | Run `npm install` |

---

## Test Reporting

After testing, document results:

```markdown
## Test Report - v1.1.0

**Date**: 2026-02-04
**Tester**: Veeresh Bikkaneti

### Results
- Manual Tests: ✅ PASS
- Security Audit: ✅ PASS (0 network calls)
- Package Test: ✅ PASS
- Cross-Platform: 🟡 Windows only

### Issues Found
- None

### Notes
- Ready for marketplace publish
```

---

## Continuous Testing

### Pre-Publish Checklist

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Build
npm run package

# 3. Package
vsce package

# 4. Test
code --install-extension *.vsix

# 5. Manual verification
# Run command in test workspace
```

---

## References

- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [vsce CLI](https://github.com/microsoft/vscode-vsce)
