import * as vscode from 'vscode';
import { AnalyzerPanel } from '../webview/AnalyzerPanel';

export class AnalyzePbiCommand {
    public static async execute(context: vscode.ExtensionContext) {
        const pbiUrl = await vscode.window.showInputBox({
            prompt: 'Enter Azure DevOps PBI URL or ID',
            placeHolder: 'https://dev.azure.com/org/project/_workitems/edit/12345',
            validateInput: (value) => {
                if (!value) {
                    return 'Please enter a PBI URL or ID';
                }
                return null;
            }
        });

        if (pbiUrl) {
            // Show analyzer panel with the PBI URL
            AnalyzerPanel.createOrShow(context, pbiUrl);
        }
    }
}
