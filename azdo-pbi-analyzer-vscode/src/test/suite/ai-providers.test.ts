/**
 * Unit tests for the provider-agnostic AI layer and the parsePbiUrl fixes.
 *
 * Deliberately vscode-free so these run under plain mocha + ts-node
 * (npm run test:unit) as well as in the VS Code extension test host.
 */
import * as assert from 'assert';
import { createProvider } from '../../ai/providerFactory';
import { LlmError } from '../../ai/types';
import {
    buildPersonaMessages,
    buildPbiContextBlock,
    isPersonaId,
    PERSONA_SYSTEM_PROMPTS,
} from '../../ai/prompts';
import { OpenAiCompatibleProvider } from '../../ai/providers/openAiCompatibleProvider';
import { AnthropicProvider } from '../../ai/providers/anthropicProvider';
import { GeminiProvider } from '../../ai/providers/geminiProvider';
import { VscodeLmProvider, SelectModelsFn } from '../../ai/providers/vscodeLmProvider';
import { DevOpsClient } from '../../api/DevOpsClient';
import type { PbiContext } from '../../analyzers/PbiAnalyzer';

function samplePbi(): PbiContext {
    return {
        id: 1234,
        title: 'Reset password via email',
        description: 'As a user I want to reset my password so I can regain access.',
        acceptanceCriteria: ['User receives an email with a reset link', 'Link expires after 1 hour'],
        workItemType: 'Product Backlog Item',
        state: 'New',
        assignedTo: '',
        areaPath: 'Web',
        iterationPath: 'Sprint 12',
    };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

suite('AI provider factory', () => {
    test('creates each supported provider', () => {
        const deps = { selectModels: (async () => []) as SelectModelsFn };
        assert.strictEqual(createProvider({ providerId: 'vscode' }, deps).id, 'vscode');
        assert.strictEqual(createProvider({ providerId: 'openai-compatible' }).id, 'openai-compatible');
        assert.strictEqual(createProvider({ providerId: 'anthropic' }).id, 'anthropic');
        assert.strictEqual(createProvider({ providerId: 'gemini' }).id, 'gemini');
    });

    test('provider ids are case-insensitive', () => {
        assert.strictEqual(createProvider({ providerId: 'Gemini' }).id, 'gemini');
    });

    test('unknown provider throws LlmError', () => {
        assert.throws(() => createProvider({ providerId: 'nope' }), LlmError);
    });

    test('vscode provider without the LM API wiring throws', () => {
        assert.throws(() => createProvider({ providerId: 'vscode' }), LlmError);
    });
});

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

suite('Persona prompts', () => {
    test('context block grounds the model in the real PBI', () => {
        const block = buildPbiContextBlock(samplePbi());
        assert.ok(block.includes('#1234'));
        assert.ok(block.includes('Reset password via email'));
        assert.ok(block.includes('AC-1: User receives an email with a reset link'));
        assert.ok(block.includes('AC-2: Link expires after 1 hour'));
    });

    test('every persona has a system prompt and builds system+user messages', () => {
        for (const persona of Object.keys(PERSONA_SYSTEM_PROMPTS) as Array<keyof typeof PERSONA_SYSTEM_PROMPTS>) {
            assert.ok(isPersonaId(persona), `${persona} should be a valid persona id`);
            const messages = buildPersonaMessages(persona, samplePbi());
            assert.strictEqual(messages.length, 2);
            assert.strictEqual(messages[0].role, 'system');
            assert.ok(messages[0].content.length > 50);
            assert.strictEqual(messages[1].role, 'user');
            assert.ok(messages[1].content.includes('Reset password'));
        }
    });

    test('user question is appended to the user message', () => {
        const messages = buildPersonaMessages('qa-engineer', samplePbi(), 'Is the expiry testable?');
        assert.ok(messages[1].content.includes('Is the expiry testable?'));
    });

    test('isPersonaId rejects unknown ids', () => {
        assert.strictEqual(isPersonaId('pilot'), false);
    });
});

// ---------------------------------------------------------------------------
// fetch stubbing helpers
// ---------------------------------------------------------------------------

interface RecordedRequest {
    url: string;
    init: RequestInit;
}

let recorded: RecordedRequest[] = [];
let nextJson: unknown = {};
let nextStatus = 200;

function stubFetchJson(json: unknown, status = 200) {
    recorded = [];
    nextJson = json;
    nextStatus = status;
    (globalThis as any).fetch = async (url: string, init: RequestInit) => {
        recorded.push({ url, init });
        return {
            ok: nextStatus >= 200 && nextStatus < 300,
            status: nextStatus,
            json: async () => nextJson,
            text: async () => JSON.stringify(nextJson),
            body: null,
        };
    };
}

function restoreFetch() {
    delete (globalThis as any).fetch;
}

// ---------------------------------------------------------------------------
// OpenAI-compatible provider
// ---------------------------------------------------------------------------

suite('OpenAI-compatible provider', () => {
    teardown(restoreFetch);

    test('sends a chat completions request and returns the reply', async () => {
        stubFetchJson({ choices: [{ message: { content: 'hello from the model' } }] });
        const provider = new OpenAiCompatibleProvider('https://api.openai.com/v1', 'test-key', 'gpt-4o-mini');
        const result = await provider.complete(
            [
                { role: 'system', content: 'sys' },
                { role: 'user', content: 'hi' },
            ],
            {}
        );
        assert.strictEqual(result, 'hello from the model');
        assert.strictEqual(recorded.length, 1);
        assert.strictEqual(recorded[0].url, 'https://api.openai.com/v1/chat/completions');
        const headers = recorded[0].init.headers as Record<string, string>;
        assert.strictEqual(headers['Authorization'], 'Bearer test-key');
        const body = JSON.parse(recorded[0].init.body as string);
        assert.strictEqual(body.model, 'gpt-4o-mini');
        assert.strictEqual(body.stream, false);
        assert.deepStrictEqual(body.messages, [
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'hi' },
        ]);
    });

    test('honors an explicit model override', async () => {
        stubFetchJson({ choices: [{ message: { content: 'ok' } }] });
        const provider = new OpenAiCompatibleProvider('http://localhost:11434/v1', 'ollama', 'llama3.1');
        await provider.complete([{ role: 'user', content: 'hi' }], { model: 'mistral' });
        const body = JSON.parse(recorded[0].init.body as string);
        assert.strictEqual(body.model, 'mistral');
        assert.strictEqual(recorded[0].url, 'http://localhost:11434/v1/chat/completions');
    });

    test('Azure OpenAI deployment URLs are used verbatim with an api-version', async () => {
        stubFetchJson({ choices: [{ message: { content: 'ok' } }] });
        const provider = new OpenAiCompatibleProvider(
            'https://myres.openai.azure.com/openai/deployments/my-dep',
            'azure-key'
        );
        await provider.complete([{ role: 'user', content: 'hi' }], {});
        assert.ok(recorded[0].url.startsWith('https://myres.openai.azure.com/openai/deployments/my-dep'));
        assert.ok(recorded[0].url.includes('api-version='));
        assert.ok(!recorded[0].url.includes('/chat/completions'));
    });

    test('missing API key throws before any network call', async () => {
        stubFetchJson({});
        const provider = new OpenAiCompatibleProvider('https://api.openai.com/v1', undefined);
        await assert.rejects(provider.complete([{ role: 'user', content: 'hi' }], {}), LlmError);
        assert.strictEqual(recorded.length, 0);
    });

    test('HTTP errors surface as LlmError with the status', async () => {
        stubFetchJson({ error: { message: 'bad key' } }, 401);
        const provider = new OpenAiCompatibleProvider('https://api.openai.com/v1', 'bad');
        await assert.rejects(provider.complete([{ role: 'user', content: 'hi' }], {}), /401/);
    });

    test('streams SSE chunks to onToken', async () => {
        recorded = [];
        const encoder = new TextEncoder();
        const chunks = [
            'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
            'data: [DONE]\n\n',
        ];
        let chunkIndex = 0;
        (globalThis as any).fetch = async (url: string, init: RequestInit) => {
            recorded.push({ url, init });
            return {
                ok: true,
                status: 200,
                body: {
                    getReader: () => ({
                        read: async () => {
                            if (chunkIndex >= chunks.length) {
                                return { done: true, value: undefined };
                            }
                            return { done: false, value: encoder.encode(chunks[chunkIndex++]) };
                        },
                    }),
                },
            };
        };
        const provider = new OpenAiCompatibleProvider('https://api.openai.com/v1', 'test-key');
        const tokens: string[] = [];
        const result = await provider.complete([{ role: 'user', content: 'hi' }], {}, (t) => tokens.push(t));
        assert.strictEqual(result, 'Hello');
        assert.deepStrictEqual(tokens, ['Hel', 'lo']);
        const body = JSON.parse(recorded[0].init.body as string);
        assert.strictEqual(body.stream, true);
    });
});

// ---------------------------------------------------------------------------
// Anthropic provider
// ---------------------------------------------------------------------------

suite('Anthropic provider', () => {
    teardown(restoreFetch);

    test('sends system separately with the right headers and joins text blocks', async () => {
        stubFetchJson({ content: [{ type: 'text', text: 'claude says hi' }] });
        const provider = new AnthropicProvider('anth-key', 'claude-sonnet-4-5');
        const result = await provider.complete(
            [
                { role: 'system', content: 'be terse' },
                { role: 'user', content: 'hello' },
            ],
            {}
        );
        assert.strictEqual(result, 'claude says hi');
        assert.strictEqual(recorded[0].url, 'https://api.anthropic.com/v1/messages');
        const headers = recorded[0].init.headers as Record<string, string>;
        assert.strictEqual(headers['x-api-key'], 'anth-key');
        assert.strictEqual(headers['anthropic-version'], '2023-06-01');
        const body = JSON.parse(recorded[0].init.body as string);
        assert.strictEqual(body.system, 'be terse');
        assert.deepStrictEqual(body.messages, [{ role: 'user', content: 'hello' }]);
        assert.strictEqual(body.model, 'claude-sonnet-4-5');
    });

    test('missing API key throws before any network call', async () => {
        stubFetchJson({});
        const provider = new AnthropicProvider(undefined);
        await assert.rejects(provider.complete([{ role: 'user', content: 'hi' }], {}), LlmError);
        assert.strictEqual(recorded.length, 0);
    });
});

// ---------------------------------------------------------------------------
// Gemini provider
// ---------------------------------------------------------------------------

suite('Gemini provider', () => {
    teardown(restoreFetch);

    test('maps roles, passes the key in the URL, and returns candidate text', async () => {
        stubFetchJson({ candidates: [{ content: { parts: [{ text: 'gemini says hi' }] } }] });
        const provider = new GeminiProvider('google-key', 'gemini-2.5-flash');
        const result = await provider.complete(
            [
                { role: 'system', content: 'be terse' },
                { role: 'assistant', content: 'previous answer' },
                { role: 'user', content: 'hello' },
            ],
            {}
        );
        assert.strictEqual(result, 'gemini says hi');
        assert.ok(recorded[0].url.includes('/models/gemini-2.5-flash:generateContent'));
        assert.ok(recorded[0].url.includes('key=google-key'));
        const body = JSON.parse(recorded[0].init.body as string);
        assert.strictEqual(body.system_instruction.parts[0].text, 'be terse');
        assert.deepStrictEqual(
            body.contents.map((c: { role: string }) => c.role),
            ['model', 'user']
        );
    });

    test('missing API key throws before any network call', async () => {
        stubFetchJson({});
        const provider = new GeminiProvider(undefined);
        await assert.rejects(provider.complete([{ role: 'user', content: 'hi' }], {}), LlmError);
        assert.strictEqual(recorded.length, 0);
    });
});

// ---------------------------------------------------------------------------
// VS Code LM provider (with an injected fake for selectChatModels)
// ---------------------------------------------------------------------------

suite('VS Code language model provider', () => {
    function fakeSelectModels(fragments: string[], modelName = 'fake-model'): SelectModelsFn {
        return async () => [
            {
                name: modelName,
                sendRequest: async (messages) => {
                    // Capture the mapped messages for assertions via a side channel.
                    (fakeSelectModels as any).lastMessages = messages;
                    return {
                        text: (async function* () {
                            for (const f of fragments) {
                                yield f;
                            }
                        })(),
                    };
                },
            },
        ];
    }

    test('folds system prompt into a leading user message and streams fragments', async () => {
        const selectModels = fakeSelectModels(['Hel', 'lo']);
        const provider = new VscodeLmProvider(selectModels);
        const tokens: string[] = [];
        const result = await provider.complete(
            [
                { role: 'system', content: 'sys prompt' },
                { role: 'user', content: 'question' },
            ],
            {},
            (t) => tokens.push(t)
        );
        assert.strictEqual(result, 'Hello');
        assert.deepStrictEqual(tokens, ['Hel', 'lo']);
        const sent = (fakeSelectModels as any).lastMessages as Array<{ role: number; content: string }>;
        assert.strictEqual(sent[0].role, 1);
        assert.ok(sent[0].content.includes('sys prompt'));
        assert.strictEqual(sent[1].role, 1);
        assert.strictEqual(sent[1].content, 'question');
    });

    test('maps assistant messages to the assistant role', async () => {
        const selectModels = fakeSelectModels(['ok']);
        const provider = new VscodeLmProvider(selectModels);
        await provider.complete(
            [
                { role: 'user', content: 'q' },
                { role: 'assistant', content: 'a' },
            ],
            {}
        );
        const sent = (fakeSelectModels as any).lastMessages as Array<{ role: number }>;
        assert.deepStrictEqual(sent.map((m) => m.role), [1, 2]);
    });

    test('throws a helpful error when no model is available', async () => {
        const provider = new VscodeLmProvider(async () => []);
        await assert.rejects(provider.complete([{ role: 'user', content: 'hi' }], {}), /No language model/);
    });

    test('requires no API key', () => {
        const provider = new VscodeLmProvider(async () => []);
        assert.strictEqual(provider.requiresApiKey, false);
    });
});

// ---------------------------------------------------------------------------
// parsePbiUrl
// ---------------------------------------------------------------------------

suite('DevOpsClient.parsePbiUrl', () => {
    test('parses a standard dev.azure.com work item URL (regression)', () => {
        const parsed = DevOpsClient.parsePbiUrl('https://dev.azure.com/myorg/myproject/_workitems/edit/12345');
        assert.ok(parsed);
        assert.strictEqual(parsed.orgUrl, 'https://dev.azure.com/myorg');
        assert.strictEqual(parsed.project, 'myproject');
        assert.strictEqual(parsed.id, 12345);
    });

    test('parses a legacy visualstudio.com URL (regression)', () => {
        const parsed = DevOpsClient.parsePbiUrl('https://myorg.visualstudio.com/myproject/_workitems/edit/777');
        assert.ok(parsed);
        assert.strictEqual(parsed.orgUrl, 'https://myorg.visualstudio.com');
        assert.strictEqual(parsed.project, 'myproject');
        assert.strictEqual(parsed.id, 777);
    });

    test('accepts a bare numeric ID when a default org is configured', () => {
        const parsed = DevOpsClient.parsePbiUrl('12345', 'https://dev.azure.com/myorg');
        assert.ok(parsed);
        assert.strictEqual(parsed.orgUrl, 'https://dev.azure.com/myorg');
        assert.strictEqual(parsed.id, 12345);
    });

    test('rejects a bare numeric ID without a default org', () => {
        assert.strictEqual(DevOpsClient.parsePbiUrl('12345'), null);
    });

    test('parses board URLs carrying ?workitem=', () => {
        const parsed = DevOpsClient.parsePbiUrl(
            'https://dev.azure.com/myorg/myproject/_boards/board/t/myteam/Stories/?workitem=999'
        );
        assert.ok(parsed);
        assert.strictEqual(parsed.orgUrl, 'https://dev.azure.com/myorg');
        assert.strictEqual(parsed.id, 999);
    });

    test('parses on-premises TFS URLs', () => {
        const parsed = DevOpsClient.parsePbiUrl('http://tfs:8080/tfs/DefaultCollection/myproject/_workitems/edit/42');
        assert.ok(parsed);
        assert.strictEqual(parsed.orgUrl, 'http://tfs:8080/tfs/DefaultCollection');
        assert.strictEqual(parsed.project, 'myproject');
        assert.strictEqual(parsed.id, 42);
    });

    test('returns null for garbage input', () => {
        assert.strictEqual(DevOpsClient.parsePbiUrl('not a url'), null);
        assert.strictEqual(DevOpsClient.parsePbiUrl(''), null);
        assert.strictEqual(DevOpsClient.parsePbiUrl('https://dev.azure.com/myorg'), null);
    });
});
