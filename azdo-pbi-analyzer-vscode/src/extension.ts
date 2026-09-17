import * as vscode from 'vscode';
import { AnalyzerPanel } from './webview/AnalyzerPanel';
import { AnalyzePbiCommand } from './commands/AnalyzePbiCommand';
import { InstallAgentsCommand } from './commands/InstallAgentsCommand';
import { PbiChatParticipant } from './chat/PbiChatParticipant';
import { clearApiKey, promptAndStoreApiKey, resolveAiProvider } from './ai/aiConfig';

export function activate(context: vscode.ExtensionContext) {

    // Initialize Copilot Chat Participant (with real multi-provider AI support)
    const chatParticipant = new PbiChatParticipant(context);
    chatParticipant.setAiResolver(() => resolveAiProvider(context));
    chatParticipant.initialize();

    // Hand analyzed PBIs from the panel to the chat participant so @azdo
    // commands operate on the PBI you just analyzed.
    AnalyzerPanel.onDidAnalyzePbi = (pbi) => chatParticipant.setCurrentPbi(pbi);

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

    // Register command to store the AI provider API key in SecretStorage
    const setAiApiKeyCommand = vscode.commands.registerCommand(
        'azdoPbiAnalyzer.setAiApiKey',
        async () => {
            await promptAndStoreApiKey(context);
        }
    );

    // Register command to remove the stored AI provider API key
    const clearAiApiKeyCommand = vscode.commands.registerCommand(
        'azdoPbiAnalyzer.clearAiApiKey',
        async () => {
            await clearApiKey(context);
        }
    );

    context.subscriptions.push(
        analyzePbiCommand,
        openPanelCommand,
        installAgentsCommand,
        setAiApiKeyCommand,
        clearAiApiKeyCommand
    );
}

export function deactivate() { }

