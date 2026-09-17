/**
 * VS Code Language Model API provider.
 *
 * This is the zero-config default: it uses whatever chat models the user
 * already has access to inside VS Code (e.g. via a GitHub Copilot
 * subscription) through the `vscode.lm` API. No API key needed.
 *
 * The actual `vscode.lm.selectChatModels` function is injected so this
 * provider stays unit-testable outside the extension host. The structural
 * types below mirror the small slice of the vscode API surface we use.
 */
import { CancellationLike, ChatMessage, ILlmProvider, LlmError, LlmOptions, TokenCallback } from '../types';

/** Mirrors vscode.LanguageModelChatMessageRole (User=1, Assistant=2). */
export interface LmMessageInput {
    role: 1 | 2;
    content: string;
}

export interface LmResponseLike {
    text: AsyncIterable<string>;
}

export interface LmModelLike {
    readonly name: string;
    sendRequest(
        messages: LmMessageInput[],
        options?: { modelOptions?: Record<string, unknown> },
        token?: CancellationLike
    ): Promise<LmResponseLike>;
}

export type SelectModelsFn = (selector?: { vendor?: string; family?: string }) => Promise<LmModelLike[]>;

export class VscodeLmProvider implements ILlmProvider {
    readonly id = 'vscode';
    readonly displayName = 'VS Code Language Models (Copilot)';
    readonly requiresApiKey = false;

    constructor(private readonly selectModels: SelectModelsFn) {}

    async complete(
        messages: ChatMessage[],
        options: LlmOptions,
        onToken?: TokenCallback,
        cancel?: CancellationLike
    ): Promise<string> {
        let models: LmModelLike[];
        try {
            models = await this.selectModels(this.selectorFor(options.model));
        } catch (e) {
            throw new LlmError(
                `Could not access VS Code language models: ${e instanceof Error ? e.message : String(e)}. ` +
                    'The Language Model API requires user consent and a Copilot subscription.',
                this.id
            );
        }

        const model = models[0];
        if (!model) {
            throw new LlmError(
                'No language model is available in VS Code for this request. ' +
                    'Check that GitHub Copilot (or another model provider) is signed in and enabled.',
                this.id
            );
        }

        // The LM API has no system role; fold system content into the first user message.
        const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
        const lmMessages: LmMessageInput[] = [];
        if (systemParts.length > 0) {
            lmMessages.push({ role: 1, content: systemParts.join('\n\n') });
        }
        for (const m of messages) {
            if (m.role === 'system') {
                continue;
            }
            lmMessages.push({ role: m.role === 'assistant' ? 2 : 1, content: m.content });
        }

        let response: LmResponseLike;
        try {
            response = await model.sendRequest(
                lmMessages,
                options.temperature !== undefined ? { modelOptions: { temperature: options.temperature } } : undefined,
                cancel
            );
        } catch (e) {
            throw new LlmError(`Language model request failed: ${e instanceof Error ? e.message : String(e)}`, this.id);
        }

        let full = '';
        for await (const fragment of response.text) {
            if (cancel?.isCancellationRequested) {
                break;
            }
            full += fragment;
            onToken?.(fragment);
        }
        return full;
    }

    /**
     * Lets users target a model family via the aiModel setting, e.g.
     * "copilot/gpt-4o" or just "gpt-4o". Empty/undefined = best available.
     */
    private selectorFor(modelSetting?: string): { vendor?: string; family?: string } | undefined {
        const value = (modelSetting || '').trim();
        if (!value) {
            return undefined;
        }
        const parts = value.split('/');
        if (parts.length >= 2) {
            return { vendor: parts[0], family: parts.slice(1).join('/') };
        }
        return { family: value };
    }
}
