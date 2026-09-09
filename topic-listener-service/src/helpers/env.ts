/**
 * Numeric env var. Falls back only when unset or unparsable, so `0` stays a valid
 * value (e.g. LISTENER_CALL_DELAY_MS=0 disables pacing).
 */
export function envNumber(name: string, fallback: number): number {
    const value = parseInt(process.env[name], 10);
    return Number.isFinite(value) ? value : fallback;
}
