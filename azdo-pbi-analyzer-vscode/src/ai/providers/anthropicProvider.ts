/**
 * Anthropic Messages API provider (Claude).
 * Docs: https://docs.anthropic.com/en/api/messages
 */
import { CancellationLike, ChatMessage, ILlmProvider, LlmError, LlmOptions, TokenCallback } from '../types';
import { createRequestAborter, toAbortError, DEFAULT_LLM_TIMEOUT_MS } from './requestAborter';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicProvider implements ILlmProvider {
    readonly id = 'anthropic';
    readonly displayName = 'Anthropic Claude';
    readonly requiresApiKey = true;

    constructor(private readonly apiKey?: string, private readonly defaultModel: string = DEFAULT_ANTHROPIC_MODEL) {}

    async complete(
        messages: ChatMessage[],
        options: LlmOptions,
        onToken?: TokenCallback,
        cancel?: CancellationLike
    ): Promise<string> {
        if (!this.apiKey) {
            throw new LlmError(
                'No API key configured for Anthropic. Run "Azure DevOps: Set AI Provider API Key".',
                this.id
            );
        }

        // The Messages API takes `system` as a top-level field, not a message.
        const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
        const convo = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content }));

        const timeoutMs = options.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;
        const aborter = createRequestAborter(cancel, timeoutMs);

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                signal: aborter.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                },
                body: JSON.stringify({
                    model: options.model || this.defaultModel,
                    max_tokens: options.maxTokens ?? 4096,
                    temperature: options.temperature ?? 0.3,
                    ...(systemParts.length > 0 ? { system: systemParts.join('\n\n') } : {}),
                    messages: convo,
                }),
            });

            if (!response.ok) {
                const body = await safeReadText(response);
                throw new LlmError(`Anthropic request failed (${response.status}): ${truncate(body, 300)}`, this.id);
            }

            const data = (await response.json()) as {
                content?: Array<{ type?: string; text?: string }>;
                error?: { message?: string };
            };
            if (data.error?.message) {
                throw new LlmError(`Anthropic error: ${data.error.message}`, this.id);
            }
            const text = (data.content ?? [])
                .filter((b) => b.type === 'text' && b.text)
                .map((b) => b.text as string)
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
            throw new LlmError(`Anthropic request failed: ${e instanceof Error ? e.message : String(e)}`, this.id);
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
