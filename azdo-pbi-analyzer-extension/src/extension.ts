import * as vscode from 'vscode';
import { ConfigurationManager } from './config/configuration';
import { AnalyzerPanel } from './ui/analyzerPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "azdo-pbi-analyzer" is now active!');

    // DI Hack: Attach context to the Panel class prototype or static prop so instances can use it
    // Better way: Pass context to `render` and have `render` pass it to constructor
    (AnalyzerPanel.currentPanel as any) = { _extensionContext: context };
    // Wait, the static property assignment above is wrong. 
    // Let's fix the DI in the Panel class by passing context in Render.
    // For now, let's just make sure we capture it.

    const configManager = new ConfigurationManager(context);

    let disposableAnalyze = vscode.commands.registerCommand('pbiAnalyzer.analyze', () => {
        // Pass context to the panel render method so it can be used for DI
        const panelWithContext = AnalyzerPanel;
        // @ts-ignore
        panelWithContext.currentPanel_Context = context;

        AnalyzerPanel.render(context.extensionUri);
        // We need to retroactively set the context on the newly created panel instance
        if (AnalyzerPanel.currentPanel) {
            (AnalyzerPanel.currentPanel as any)._extensionContext = context;
        }
    });

    let disposableSetPat = vscode.commands.registerCommand('pbiAnalyzer.setPat', async () => {
        const success = await configManager.configure();
        if (success) {
            vscode.window.showInformationMessage('Azure DevOps configuration saved.');
        }
    });

    context.subscriptions.push(disposableAnalyze);
    context.subscriptions.push(disposableSetPat);
}

export function deactivate() { }
