/**
 * Cryptographically random integer in [0, maxExclusive).
 * Use this in place of `Math.floor(Math.random() * N)` for generating
 * non-conflicting test names, IDs, and similar values in Cypress specs.
 */
export function randomInt(maxExclusive) {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
        return 0;
    }
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return Math.floor((buf[0] / 0x100000000) * maxExclusive);
}
