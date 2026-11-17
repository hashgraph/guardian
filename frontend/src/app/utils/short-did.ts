/**
 * Shortens the identifier part of a DID, keeping the "did:method:network:" prefix
 * and any "_suffix": did:hedera:testnet:AusU…0497_0.0.123
 */
export function shortDid(did: string | null | undefined): string {
    const match = /^(did:[^:]+:[^:]+:)([^_]+)(_.*)?$/.exec(did || '');
    if (!match || match[2].length <= 12) {
        return did || '';
    }
    return `${match[1]}${match[2].slice(0, 4)}…${match[2].slice(-4)}${match[3] || ''}`;
}
