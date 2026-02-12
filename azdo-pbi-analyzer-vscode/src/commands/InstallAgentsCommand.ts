import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class InstallAgentsCommand {
    constructor(private context: vscode.ExtensionContext) { }

    public async execute(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const targetAgentDir = path.join(workspaceRoot, '.agent');

        // Check if .agent folder already exists
        if (fs.existsSync(targetAgentDir)) {
            const overwrite = await vscode.window.showWarningMessage(
                'The .agent folder already exists. Do you want to overwrite it?',
                'Yes',
                'No'
            );
            if (overwrite !== 'Yes') {
                return;
            }
        }

        try {
            // Source: extension's bundled assets
            const sourceAgentDir = path.join(this.context.extensionPath, 'dist', 'assets', '.agent');

            if (!fs.existsSync(sourceAgentDir)) {
                vscode.window.showErrorMessage(
                    'Agent assets not found in extension package. Please reinstall the extension.'
                );
                return;
            }

            // Copy directory recursively
            await this.copyDirectory(sourceAgentDir, targetAgentDir);

            vscode.window.showInformationMessage(
                '✅ AI Agents installed successfully! You can now use QA personas and workflows in your workspace.'
            );

            // Optionally open ARCHITECTURE.md
            const architectureFile = path.join(targetAgentDir, 'ARCHITECTURE.md');
            if (fs.existsSync(architectureFile)) {
                const openDoc = await vscode.window.showInformationMessage(
                    'Would you like to open the ARCHITECTURE.md file to learn about the agents?',
                    'Yes',
                    'No'
                );
                if (openDoc === 'Yes') {
                    const doc = await vscode.workspace.openTextDocument(architectureFile);
                    await vscode.window.showTextDocument(doc);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to install agents: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    private async copyDirectory(source: string, destination: string): Promise<void> {
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }

        const entries = fs.readdirSync(source, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}
