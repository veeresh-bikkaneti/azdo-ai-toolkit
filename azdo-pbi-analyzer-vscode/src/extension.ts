import * as vscode from 'vscode';
import { AnalyzerPanel } from './webview/AnalyzerPanel';
import { AnalyzePbiCommand } from './commands/AnalyzePbiCommand';

export function activate(context: vscode.ExtensionContext) {

    // Register command to analyze PBI
    const analyzePbiCommand = vscode.commands.registerCommand(
        'azdoPbiAnalyzer.analyzePbi',
        async () => {
            await AnalyzePbiCommand.execute(context);
        }
    );

    // Register command to open analyzer panel
    const openPanelCommand = vscode.commands.registerCommand(
        'azdoPbiAnalyzer.openPanel',
        () => {
            AnalyzerPanel.createOrShow(context);
        }
    );

    context.subscriptions.push(analyzePbiCommand, openPanelCommand);
}

export function deactivate() { }
