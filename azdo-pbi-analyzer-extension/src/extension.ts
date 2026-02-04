import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// --- Local Logger Helper ---
function logTransaction(rootPath: string, status: string, details: string) {
    const logFilePath = path.join(rootPath, 'AI_Initiative_Activity_Log.md');
    const timestamp = new Date().toISOString();
    const user = process.env.USERNAME || 'User';

    // Ensure header exists
    if (!fs.existsSync(logFilePath)) {
        const header = `| Timestamp | User | Status | Details |\n|---|---|---|---|\n`;
        fs.writeFileSync(logFilePath, header);
    }

    // Append log entry
    // Sanitize details to prevent breaking markdown table
    const safeDetails = details.replace(/\|/g, '-').replace(/\n/g, ' ');
    const entry = `| ${timestamp} | ${user} | **${status}** | ${safeDetails} |\n`;

    try {
        fs.appendFileSync(logFilePath, entry);
    } catch (error) {
        console.error('Failed to write to local log:', error);
    }
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('aiInitiative.scaffold', async () => {

        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('AI Initiative: Please open a folder/workspace first.');
            return;
        }

        const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const targetDir = path.join(rootPath, 'AI_Initiative_Docs');
        const templatesDir = path.join(context.extensionPath, 'templates');

        // Start Progress UI
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AI Initiative Scaffolder",
            cancellable: false
        }, async (progress, token) => {

            progress.report({ message: "Initializing...", increment: 0 });

            // Start Logging
            logTransaction(rootPath, 'JOB_STARTED', 'AI Initiative Scaffolder process initiated.');

            try {
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir);
                    logTransaction(rootPath, 'IN_PROGRESS', `Created directory: ${targetDir}`);
                }

                const files = fs.readdirSync(templatesDir);
                const totalFiles = files.length;
                const incrementStep = 100 / totalFiles;

                for (const file of files) {
                    const srcPath = path.join(templatesDir, file);
                    const destPath = path.join(targetDir, file);

                    progress.report({ message: `Scaffolding ${file}...`, increment: incrementStep });

                    // Read content
                    let content = fs.readFileSync(srcPath, 'utf8');

                    // Runtime replacements (customizing for the user's specific project)
                    content = content.replace(/<PROJECT_ROOT>/g, rootPath.replace(/\\/g, '/'));
                    content = content.replace(/<USER>/g, process.env.USERNAME || 'User');

                    fs.writeFileSync(destPath, content);
                    logTransaction(rootPath, 'IN_PROGRESS', `Scaffolded template: ${file}`);

                    // Small artificial delay to ensure user sees the progress
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                progress.report({ message: "Finalizing...", increment: 100 });
                vscode.window.showInformationMessage('AI Initiative Documentation successfully created!');
                logTransaction(rootPath, 'SUCCESS', 'All templates scaffolded successfully.');

                // Open the overview file
                const overviewPath = path.join(targetDir, 'AI_Overview.md');
                if (fs.existsSync(overviewPath)) {
                    const doc = await vscode.workspace.openTextDocument(overviewPath);
                    vscode.window.showTextDocument(doc);
                }

            } catch (err: any) {
                const errorMessage = err.message || 'Unknown error';
                logTransaction(rootPath, 'FAILURE', `Critical Error: ${errorMessage}`);
                vscode.window.showErrorMessage(`AI Initiative Scaffolding Failed. See AI_Initiative_Activity_Log.md for details.`);
            } finally {
                logTransaction(rootPath, 'JOB_COMPLETED', 'Process finished gracefully.');
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
