import { Hashing } from '@guardian/common/helpers/hashing';

/**
 * Identifier and topic of a Hedera DID, both the current (`...:ID_0.0.1`) and the old (`...:ID;hedera:net:tid=0.0.1`) form
 * @param did
 */
export function parseDid(did: string): { identifier: string, topicId: string | null } {
    const [main, ...parameters] = String(did).split(';');
    const parts = main.split(':');
    if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'hedera') {
        throw new Error('Invalid DID.');
    }
    const [identifier, topic] = parts[3].split('_');
    let topicId: string | null = topic || null;
    for (const parameter of parameters) {
        const match = /(?:^|:)tid=([^:;]+)$/.exec(parameter);
        if (match) {
            topicId = match[1];
        }
    }
    return { identifier, topicId };
}

/**
 * Identifier of a Hedera DID made from the given public key
 * @param publicKey - raw Ed25519 public key
 */
export function didIdentifierOfKey(publicKey: Uint8Array): string {
    return Hashing.base58.encode(Hashing.sha256.digest(publicKey));
}
