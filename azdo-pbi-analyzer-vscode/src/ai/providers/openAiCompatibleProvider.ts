/**
 * OpenAI-compatible chat completions provider.
 *
 * One adapter, many vendors: anything that speaks `POST {base}/chat/completions`
 * works here — OpenAI, Azure OpenAI (deployment URLs), Ollama, LM Studio,
 * OpenRouter, Together, DeepSeek, xAI, vLLM, and friends.
 *
 * Azure OpenAI note: set the endpoint to the full deployment URL, e.g.
 * https://<resource>.openai.azure.com/openai/deployments/<deployment>
 * (the api-version query is appended automatically when missing).
 */
import { CancellationLike, ChatMessage, ILlmProvider, LlmError, LlmOptions, TokenCallback } from '../types';

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

interface OpenAiChoice {
    message?: { content?: string | null };
    delta?: { content?: string | null };
}

export class OpenAiCompatibleProvider implements ILlmProvider {
    readonly id = 'openai-compatible';
    readonly displayName = 'OpenAI-compatible (OpenAI, Azure OpenAI, Ollama, OpenRouter, ...)';
    readonly requiresApiKey = true;

    constructor(
        private readonly baseUrl: string = DEFAULT_OPENAI_BASE_URL,
        private readonly apiKey?: string,
        private readonly defaultModel: string = DEFAULT_OPENAI_MODEL
    ) {}

    private resolveUrl(): string {
        const base = (this.baseUrl || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, '');
        // Azure OpenAI deployment URLs already contain the full path.
        if (base.includes('/openai/deployments/')) {
            return base.includes('api-version=') ? base : `${base}?api-version=2024-10-21`;
        }
        return `${base}/chat/completions`;
    }

    async complete(
        messages: ChatMessage[],
        options: LlmOptions,
        onToken?: TokenCallback,
        cancel?: CancellationLike
    ): Promise<string> {
        if (!this.apiKey) {
            throw new LlmError(
                'No API key configured for the OpenAI-compatible provider. Run "Azure DevOps: Set AI Provider API Key".',
                this.id
            );
        }

        const model = options.model || this.defaultModel;
        const controller = new AbortController();
        const onCancelPoll = setInterval(() => {
            if (cancel?.isCancellationRequested) {
                controller.abort();
            }
        }, 100);

        try {
            const response = await fetch(this.resolveUrl(), {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: messages.map((m) => ({ role: m.role, content: m.content })),
                    temperature: options.temperature ?? 0.3,
                    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
                    // Inline (not aliased to a const): keeps TS narrowing sound below.
                    stream: onToken !== undefined,
                }),
            });

            if (!response.ok) {
                const body = await safeReadText(response);
                throw new LlmError(
                    `OpenAI-compatible request failed (${response.status}): ${truncate(body, 300)}`,
                    this.id
                );
            }

            if (onToken) {
                return await this.readSseStream(response, onToken);
            }

            const data = (await response.json()) as { choices?: OpenAiChoice[]; error?: { message?: string } };
            if (data.error?.message) {
                throw new LlmError(`Provider error: ${data.error.message}`, this.id);
            }
            return data.choices?.[0]?.message?.content ?? '';
        } catch (e) {
            if (e instanceof LlmError) {
                throw e;
            }
            throw new LlmError(
                `OpenAI-compatible request failed: ${e instanceof Error ? e.message : String(e)}`,
                this.id
            );
        } finally {
            clearInterval(onCancelPoll);
        }
    }

    /** Parses a Server-Sent Events stream of chat completion chunks. */
    private async readSseStream(response: Response, onToken: TokenCallback): Promise<string> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new LlmError('Streaming not supported by this endpoint response.', this.id);
        }
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';

        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) {
                    continue;
                }
                const payload = trimmed.slice(5).trim();
                if (payload === '[DONE]') {
                    continue;
                }
                try {
                    const chunk = JSON.parse(payload) as { choices?: OpenAiChoice[] };
                    const token = chunk.choices?.[0]?.delta?.content ?? '';
                    if (token) {
                        full += token;
                        onToken(token);
                    }
                } catch {
                    // Ignore malformed SSE lines; the stream usually recovers.
                }
            }
        }
        return full;
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
