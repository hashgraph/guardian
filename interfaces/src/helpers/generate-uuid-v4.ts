/**
 * Generate a random RFC 4122 v4 UUID using the Web Crypto API.
 */
export function GenerateUUIDv4(): string {
    return globalThis.crypto.randomUUID();
}

/**
 * Generate a 32-character random hex identifier using the Web Crypto API.
 */
export function GenerateID(): string {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}