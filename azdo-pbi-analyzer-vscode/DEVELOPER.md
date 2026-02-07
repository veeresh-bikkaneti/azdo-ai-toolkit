# Developer Guide

Welcome to the development guide for the **Azure DevOps PBI Analyzer** VS Code extension. This document will help you set up your environment, build the project, run tests, and package the extension for distribution.

## 🛠️ Prerequisites

Before you start, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (Version 16.x or higher recommended)
*   [Git](https://git-scm.com/)
*   [Visual Studio Code](https://code.visualstudio.com/)

---

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/veeresh-bikkaneti/azdo-ai-toolkit.git
    cd azdo-ai-toolkit/azdo-pbi-analyzer-vscode
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Open the project in VS Code:**
    ```bash
    code .
    ```

---

## 🏃 Running and Debugging

You can run the extension directly within VS Code using the **Extension Development Host**.

1.  Open the **Run and Debug** view (`Ctrl+Shift+D`).
2.  Select **"Run Extension"** from the dropdown menu.
3.  Press `F5` or click the green play button.

This will launch a new VS Code window with the extension loaded. You can verify this by checking the extensions list or running one of the commands (e.g., "Azure DevOps: Open Analyzer Panel").

### Reloading Changes
If you make changes to the code, you can reload the extension window by pressing `Ctrl+R` (Cmd+R on Mac) in the Extension Development Host window.

---

## 📦 Building and Packaging

### Compilation
The project uses `esbuild` for bundling.

*   **Watch Mode (Development):**
    ```bash
    npm run watch
    ```
    This script watches for file changes and rebuilds automatically.

*   **Production Build:**
    ```bash
    npm run compile
    ```
    This creates a minified bundle in the `dist` folder.

### Creating a VSIX Package
To distribute the extension, you need to package it into a `.vsix` file.

1.  **Install `vsce` globally (if not already installed):**
    ```bash
    npm install -g @vscode/vsce
    ```

2.  **Package the extension:**
    ```bash
    vsce package
    ```

This will generate a file named `azdo-pbi-analyzer-1.0.0.vsix` in the project root.

### Publishing to Marketplace
To publish, you need a Personal Access Token (PAT) from Azure DevOps with "Marketplace (Manage)" scope.

```bash
vsce login <publisher id>
vsce publish
```

---

## 🧪 Testing

The project includes a test suite to ensure functionality.

*   **Run Extension Tests:**
    ```bash
    npm test
    ```
    This launches a VS Code instance and runs the tests defined in `src/test/suite/`.

---

## 📂 Project Structure

*   `src/extension.ts`: Main entry point for the extension.
*   `package.json`: Extension manifest (commands, configuration, views).
*   `tsconfig.json`: TypeScript configuration.
*   `.vscode/launch.json`: Debugging configuration.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

---

**Thank you for contributing to Azure DevOps PBI Analyzer!**
