/**
 * Public surface of the AI layer.
 * The extension host wiring lives in ./aiConfig (imports vscode);
 * everything else here is vscode-free and unit-testable.
 */
export * from './types';
export * from './prompts';
export * from './providerFactory';
export * from './providers/openAiCompatibleProvider';
export * from './providers/anthropicProvider';
export * from './providers/geminiProvider';
export * from './providers/vscodeLmProvider';
