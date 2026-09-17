/**
 * Google Gemini API provider (Generative Language `generateContent`).
 * Docs: https://ai.google.dev/api/generate-content
 */
import { CancellationLike, ChatMessage, ILlmProvider, LlmError, LlmOptions, TokenCallback } from '../types';
import { createRequestAborter, toAbortError, DEFAULT_LLM_TIMEOUT_MS } from './requestAborter';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export class GeminiProvider implements ILlmProvider {
    readonly id = 'gemini';
    readonly displayName = 'Google Gemini';
    readonly requiresApiKey = true;

    constructor(private readonly apiKey?: string, private readonly defaultModel: string = DEFAULT_GEMINI_MODEL) {}

    async complete(
        messages: ChatMessage[],
        options: LlmOptions,
        onToken?: TokenCallback,
        cancel?: CancellationLike
    ): Promise<string> {
        if (!this.apiKey) {
            throw new LlmError(
                'No API key configured for Gemini. Run "Azure DevOps: Set AI Provider API Key".',
                this.id
            );
        }

        const model = options.model || this.defaultModel;
        const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
        const contents = messages
            .filter((m) => m.role !== 'system')
            // Gemini roles: 'user' | 'model'
            .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

        const timeoutMs = options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;
        const aborter = createRequestAborter(cancel, timeoutMs);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
            const response = await fetch(url, {
                method: 'POST',
                signal: aborter.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(systemParts.length > 0
                        ? { system_instruction: { parts: [{ text: systemParts.join('\n\n') }] } }
                        : {}),
                    contents,
                    generationConfig: {
                        temperature: options.temperature ?? 0.3,
                        ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
                    },
                }),
            });

            if (!response.ok) {
                const body = await safeReadText(response);
                throw new LlmError(`Gemini request failed (${response.status}): ${truncate(body, 300)}`, this.id);
            }

            const data = (await response.json()) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                error?: { message?: string };
            };
            if (data.error?.message) {
                throw new LlmError(`Gemini error: ${data.error.message}`, this.id);
            }
            const text = (data.candidates?.[0]?.content?.parts ?? [])
                .map((p) => p.text ?? '')
                .join('');
            onToken?.(text);
            return text;
        } catch (e) {
            if (e instanceof LlmError) {
                throw e;
            }
            const aborted = toAbortError(e, this.id, aborter.timedOut, timeoutMs);
            if (aborted) {
                throw aborted;
            }
            throw new LlmError(`Gemini request failed: ${e instanceof Error ? e.message : String(e)}`, this.id);
        } finally {
            aborter.dispose();
        }
    }
}

async function safeReadText(response: Response): Promise<string> {
    try {
        return await response.text();
    } catch {
        return '<unreadable response body>';
    }
}

function truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max) + '…' : text;
}
