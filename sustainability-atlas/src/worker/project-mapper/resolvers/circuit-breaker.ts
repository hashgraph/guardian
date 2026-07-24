/**
 * Per-strategy circuit breaker. State is implicit in `openedAt`:
 *   - null              → CLOSED (or a HALF-OPEN probe is in flight after cooldown)
 *   - non-null, elapsed < cooldownMs → OPEN: short-circuit to fallback
 *   - non-null, elapsed >= cooldownMs → HALF-OPEN: allow one probe
 *
 * `openedAt` uses null (never 0) as the CLOSED sentinel because Date.now() can
 * legitimately return 0 in tests, making 0 indistinguishable from "never opened".
 */

export interface CircuitBreakerLogger {
    log(message: string): void;
    warn(message: string): void;
}

export class CircuitBreaker {
    private consecutiveFailures = 0;
    // CLOSED sentinel MUST be null, never 0: Date.now() can legitimately be 0
    // (mocked in tests), and 0 would be indistinguishable from "never opened".
    private openedAt: number | null = null;

    constructor(
        private readonly name: string,
        private readonly threshold: number,
        private readonly cooldownMs: number,
        private readonly logger?: CircuitBreakerLogger,
    ) {}

    async run<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
        // OPEN within cooldown → short-circuit to fallback WITHOUT calling fn.
        if (this.openedAt !== null) {
            const elapsed = Date.now() - this.openedAt;
            if (elapsed < this.cooldownMs) {
                return fallback;
            }
            // cooldown elapsed → allow one HALF-OPEN probe (log it)
            this.logger?.log(`circuit[${this.name}] HALF-OPEN: probing after cooldown`);
        }

        try {
            const result = await fn();
            // Success while a probe was in flight closes the breaker (log it).
            if (this.openedAt !== null) {
                this.logger?.log(`circuit[${this.name}] CLOSED: probe succeeded`);
            }
            this.consecutiveFailures = 0;
            this.openedAt = null;
            return result;
        } catch (err) {
            this.consecutiveFailures++;
            this.logger?.warn(
                `circuit[${this.name}] failure ${this.consecutiveFailures}/${this.threshold}: ${String(err)}`,
            );
            if (this.consecutiveFailures >= this.threshold) {
                this.openedAt = Date.now();
                this.logger?.warn(`circuit[${this.name}] OPEN for ${this.cooldownMs}ms`);
            }
            // A thrown strategy is absorbed as a no-op: return fallback, never rethrow.
            return fallback;
        }
    }
}
