/**
 * Core contracts for the provider-agnostic AI layer.
 *
 * Think of this file as the shape of a universal power plug: the rest of the
 * extension only ever talks to `ILlmProvider`. Each AI vendor gets a small
 * adapter (see ./providers/) that converts this one shape into whatever
 * socket that vendor's HTTP API expects.
 *
 * This module intentionally does NOT import 'vscode', so the providers and
 * the factory stay unit-testable outside the VS Code extension host.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
    role: ChatRole;
    content: string;
}

export interface LlmOptions {
    /** Model/deployment identifier. Falls back to the provider default when omitted. */
    model?: string;
    /** 0..2, lower = more deterministic. Defaults are provider-specific. */
    temperature?: number;
    /** Cap on generated tokens. */
    maxTokens?: number;
}

/** Minimal structural stand-in for vscode.CancellationToken (keeps this module vscode-free). */
export interface CancellationLike {
    readonly isCancellationRequested: boolean;
}

export type TokenCallback = (token: string) => void;

export interface ILlmProvider {
    /** Stable id used in settings, e.g. 'openai-compatible'. */
    readonly id: string;
    /** Human-friendly name shown in the UI. */
    readonly displayName: string;
    /** True when the provider needs an API key from SecretStorage. */
    readonly requiresApiKey: boolean;

    /**
     * Send messages and resolve with the full assistant reply.
     * When `onToken` is supplied the provider should call it with text as it
     * arrives (streaming); providers without streaming support call it once
     * with the complete text.
     */
    complete(
        messages: ChatMessage[],
        options: LlmOptions,
        onToken?: TokenCallback,
        cancel?: CancellationLike
    ): Promise<string>;
}

export interface ProviderConfig {
    providerId: string;
    model?: string;
    /** Base URL for HTTP providers (OpenAI-compatible). Ignored by others. */
    endpoint?: string;
    /** Secret API key. Never log this. */
    apiKey?: string;
}

export class LlmError extends Error {
    constructor(message: string, public readonly providerId?: string) {
        super(message);
        this.name = 'LlmError';
    }
}
