import * as vscode from 'vscode';
import { AnalyzerPanel } from './webview/AnalyzerPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Azure DevOps PBI Analyzer extension activated');

    // Register command to analyze PBI
    const analyzePbiCommand = vscode.commands.registerCommand(
        'azdoPbiAnalyzer.analyzePbi',
        async () => {
            const pbiUrl = await vscode.window.showInputBox({
                prompt: 'Enter Azure DevOps PBI URL or ID',
                placeholder: 'https://dev.azure.com/org/project/_workitems/edit/12345',
                validateInput: (value) => {
                    if (!value) {
                        return 'Please enter a PBI URL or ID';
                    }
                    return null;
                }
            });

            if (pbiUrl) {
                // Show analyzer panel with the PBI URL
                AnalyzerPanel.createOrShow(context.extensionUri, pbiUrl);
            }
        }
    );

    // Register command to open analyzer panel
    const openPanelCommand = vscode.commands.registerCommand(
        'azdoPbiAnalyzer.openPanel',
        () => {
            AnalyzerPanel.createOrShow(context.extensionUri);
        }
    );

    context.subscriptions.push(analyzePbiCommand, openPanelCommand);
}

export function deactivate() {
    console.log('Azure DevOps PBI Analyzer extension deactivated');
}
