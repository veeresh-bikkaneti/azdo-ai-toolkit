/**
 * Provider registry: turns a ProviderConfig into a live ILlmProvider.
 * Keeps provider construction in one place so new vendors are a ~20 line addition.
 */
import { ILlmProvider, LlmError, ProviderConfig } from './types';
import { OpenAiCompatibleProvider } from './providers/openAiCompatibleProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { SelectModelsFn, VscodeLmProvider } from './providers/vscodeLmProvider';

export const SUPPORTED_PROVIDERS = ['vscode', 'openai-compatible', 'anthropic', 'gemini'] as const;
export type SupportedProviderId = (typeof SUPPORTED_PROVIDERS)[number];

export interface FactoryDeps {
    /** Required only for the 'vscode' provider; injected by the extension host wiring. */
    selectModels?: SelectModelsFn;
}

export function createProvider(config: ProviderConfig, deps: FactoryDeps = {}): ILlmProvider {
    const providerId = (config.providerId || 'vscode').trim().toLowerCase();

    switch (providerId) {
        case 'vscode': {
            if (!deps.selectModels) {
                throw new LlmError(
                    "The 'vscode' provider needs the VS Code Language Model API, which is only available inside the extension host."
                );
            }
            return new VscodeLmProvider(deps.selectModels);
        }
        case 'openai-compatible':
        case 'openai':
            return new OpenAiCompatibleProvider(config.endpoint, config.apiKey, config.model);
        case 'anthropic':
            return new AnthropicProvider(config.apiKey, config.model);
        case 'gemini':
            return new GeminiProvider(config.apiKey, config.model);
        default:
            throw new LlmError(
                `Unknown AI provider '${config.providerId}'. Supported: ${SUPPORTED_PROVIDERS.join(', ')}.`
            );
    }
}

export function isSupportedProviderId(value: string): value is SupportedProviderId {
    return (SUPPORTED_PROVIDERS as readonly string[]).includes((value || '').trim().toLowerCase());
}
