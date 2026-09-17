/**
 * Extension-host wiring for the AI layer: reads settings, fetches the API
 * key from SecretStorage (never from settings files or .env), and builds
 * the configured provider.
 *
 * API keys live ONLY in VS Code SecretStorage under 'azdoPbiAnalyzer.aiApiKey'.
 * They are never written to disk by this extension and never logged.
 */
import * as vscode from 'vscode';
import { createProvider, isSupportedProviderId } from './providerFactory';
import { ILlmProvider } from './types';

export const AI_API_KEY_SECRET = 'azdoPbiAnalyzer.aiApiKey';

export interface AiResolution {
    provider: ILlmProvider | null;
    /** Human-readable reason when provider is null (shown in fallback messaging). */
    reason?: string;
}

export async function resolveAiProvider(context: vscode.ExtensionContext): Promise<AiResolution> {
    const config = vscode.workspace.getConfiguration('azdoPbiAnalyzer');

    if (config.get<boolean>('aiEnabled', true) === false) {
        return { provider: null, reason: 'AI is disabled (azdoPbiAnalyzer.aiEnabled=false).' };
    }

    const rawProviderId = config.get<string>('aiProvider', 'vscode');
    if (!isSupportedProviderId(rawProviderId)) {
        return { provider: null, reason: `Unknown AI provider '${rawProviderId}' in settings.` };
    }

    const providerConfig = {
        providerId: rawProviderId,
        model: config.get<string>('aiModel', '').trim() || undefined,
        endpoint: config.get<string>('aiEndpoint', '').trim() || undefined,
        apiKey: (await context.secrets.get(AI_API_KEY_SECRET)) || undefined,
    };

    try {
        const provider = createProvider(providerConfig, {
            selectModels: (selector) => vscode.lm.selectChatModels(selector as any) as any,
        });
        if (provider.requiresApiKey && !providerConfig.apiKey) {
            return {
                provider: null,
                reason:
                    `The '${rawProviderId}' provider needs an API key. ` +
                    'Run "Azure DevOps: Set AI Provider API Key" from the Command Palette.',
            };
        }
        return { provider };
    } catch (e) {
        return { provider: null, reason: e instanceof Error ? e.message : String(e) };
    }
}

/** Prompts for an API key and stores it in SecretStorage. */
export async function promptAndStoreApiKey(context: vscode.ExtensionContext): Promise<void> {
    const key = await vscode.window.showInputBox({
        prompt: 'Enter the API key for your AI provider (OpenAI-compatible, Anthropic, or Gemini)',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'sk-... / anthropic key / Google AI Studio key',
        validateInput: (value) => (value.trim() ? null : 'API key cannot be empty'),
    });
    if (!key) {
        return;
    }
    await context.secrets.store(AI_API_KEY_SECRET, key.trim());
    vscode.window.showInformationMessage(
        'AI API key stored securely in VS Code Secret Storage. ' +
            "It is never written to settings files. Use 'Clear AI Provider API Key' to remove it."
    );
}

/** Removes the stored API key. */
export async function clearApiKey(context: vscode.ExtensionContext): Promise<void> {
    await context.secrets.delete(AI_API_KEY_SECRET);
    vscode.window.showInformationMessage('Stored AI API key has been removed.');
}
