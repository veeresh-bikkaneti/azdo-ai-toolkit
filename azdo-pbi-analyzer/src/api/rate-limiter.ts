/**
 * Rate limiter for Azure DevOps API to prevent hitting rate limits
 */

export class RateLimiter {
    private requestCount = 0;
    private windowStart = Date.now();
    private readonly maxRequests: number;
    private readonly windowMs: number;
    private readonly minDelayMs: number;

    constructor(maxRequests = 150, windowMs = 60000, minDelayMs = 100) {
        this.maxRequests = maxRequests; // Azure DevOps allows ~200/min on free tier
        this.windowMs = windowMs; // 1 minute window
        this.minDelayMs = minDelayMs; // Minimum delay between requests
    }

    /**
     * Wait if necessary to respect rate limits
     */
    public async throttle(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.windowStart;

        // Reset window if it's expired
        if (elapsed >= this.windowMs) {
            this.requestCount = 0;
            this.windowStart = now;
        }

        // If we're approaching the limit, wait
        if (this.requestCount >= this.maxRequests) {
            const waitTime = this.windowMs - elapsed;
            if (waitTime > 0) {
                console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
                await this.sleep(waitTime);
                this.requestCount = 0;
                this.windowStart = Date.now();
            }
        }

        // Always add minimum delay between requests
        await this.sleep(this.minDelayMs);
        this.requestCount++;
    }

    /**
     * Get current rate limit status
     */
    public getStatus(): { requestCount: number; remainingRequests: number; resetIn: number } {
        const now = Date.now();
        const elapsed = now - this.windowStart;
        const resetIn = Math.max(0, this.windowMs - elapsed);

        return {
            requestCount: this.requestCount,
            remainingRequests: Math.max(0, this.maxRequests - this.requestCount),
            resetIn,
        };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
