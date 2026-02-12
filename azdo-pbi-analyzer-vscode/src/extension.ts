import * as vscode from 'vscode';
import { AnalyzerPanel } from './webview/AnalyzerPanel';
import { AnalyzePbiCommand } from './commands/AnalyzePbiCommand';
import { InstallAgentsCommand } from './commands/InstallAgentsCommand';
import { PbiChatParticipant } from './chat/PbiChatParticipant';

export function activate(context: vscode.ExtensionContext) {

    // Initialize Copilot Chat Participant
    const chatParticipant = new PbiChatParticipant(context);
    chatParticipant.initialize();

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

    // Register command to install AI agents
    const installAgentsCmd = new InstallAgentsCommand(context);
    const installAgentsCommand = vscode.commands.registerCommand(
        'azdoPbiAnalyzer.installAgents',
        async () => {
            await installAgentsCmd.execute();
        }
    );

    context.subscriptions.push(analyzePbiCommand, openPanelCommand, installAgentsCommand);
}

export function deactivate() { }

