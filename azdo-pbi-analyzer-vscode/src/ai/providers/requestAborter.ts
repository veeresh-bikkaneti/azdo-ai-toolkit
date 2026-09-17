/**
 * Shared abort wiring for HTTP-based LLM providers.
 *
 * OWASP LLM04 (Model Denial of Service): every outbound model call gets a
 * hard timeout in addition to user cancellation, so a hung endpoint can never
 * wedge the extension host forever.
 */
import type { CancellationLike } from '../types';
import { LlmError } from '../types';

/** Default ceiling for a single model request. */
export const DEFAULT_LLM_TIMEOUT_MS = 60_000;

export interface RequestAborter {
    signal: AbortSignal;
    dispose(): void;
    /** True when the abort was triggered by the timeout, not by cancellation. */
    readonly timedOut: boolean;
}

export function createRequestAborter(
    cancel?: CancellationLike,
    timeoutMs: number = DEFAULT_LLM_TIMEOUT_MS
): RequestAborter {
    const controller = new AbortController();
    let timedOut = false;

    let poll: ReturnType<typeof setInterval> | undefined;
    if (cancel) {
        poll = setInterval(() => {
            if (cancel.isCancellationRequested) {
                controller.abort();
            }
        }, 100);
    }

    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    return {
        signal: controller.signal,
        get timedOut() {
            return timedOut;
        },
        dispose: () => {
            if (poll !== undefined) {
                clearInterval(poll);
            }
            clearTimeout(timer);
        },
    };
}

/**
 * Maps an abort-flavored failure to a clear, user-actionable LlmError.
 * Returns null when the error was not caused by aborting the request.
 */
export function toAbortError(
    e: unknown,
    providerId: string,
    timedOut: boolean,
    timeoutMs: number
): LlmError | null {
    if (e instanceof Error && (e.name === 'AbortError' || timedOut)) {
        return new LlmError(
            timedOut
                ? `Request timed out after ${Math.round(timeoutMs / 1000)}s. The model endpoint may be overloaded — try again or choose a smaller model.`
                : 'Request was cancelled.',
            providerId
        );
    }
    return null;
}
