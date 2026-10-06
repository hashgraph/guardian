import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

/**
 * Minimum RSA modulus length accepted by jsonwebtoken for RS256 signing
 */
export const MIN_RSA_KEY_BITS = 2048;

const looksLikePem = (s: string) =>
    s.includes('BEGIN') && s.includes('END') && s.includes('-----');

/**
 * Check a single RS256 key
 * @param pem PEM-encoded key
 * @param name Setting name used in the message
 * @param type Key type
 * @returns Human-readable problem, or null when the key is usable
 */
export function checkRsaKey(pem: string, name: string, type: 'private' | 'public'): string | null {
    if (!pem || (typeof pem === 'string' && pem.trim().length < 8)) {
        return `${name} is missing or empty`;
    }
    if (typeof pem !== 'string' || !looksLikePem(pem)) {
        return `${name} is not a valid PEM string`;
    }
    let key: crypto.KeyObject;
    try {
        key = type === 'private' ? crypto.createPrivateKey(pem) : crypto.createPublicKey(pem);
    } catch (error) {
        return `${name} cannot be parsed: ${error.message}`;
    }
    if (key.asymmetricKeyType !== 'rsa') {
        return `${name} is not an RSA key (key type: ${key.asymmetricKeyType}); an RSA key is required`;
    }
    const bits = key.asymmetricKeyDetails?.modulusLength;
    if (bits < MIN_RSA_KEY_BITS) {
        return `${name} is a ${bits}-bit RSA key; at least ${MIN_RSA_KEY_BITS} bits are required`;
    }
    return null;
}

/**
 * Check an RS256 key pair
 * @param publicKey PEM-encoded public key
 * @param privateKey PEM-encoded private key
 * @param publicName Public key setting name used in the message
 * @param privateName Private key setting name used in the message
 * @returns Human-readable problem, or null when the pair is usable
 */
export function checkRsaKeyPair(
    publicKey: string,
    privateKey: string,
    publicName: string,
    privateName: string
): string | null {
    const keyError = checkRsaKey(privateKey, privateName, 'private') || checkRsaKey(publicKey, publicName, 'public');
    if (keyError) {
        return keyError;
    }
    try {
        const probe = jwt.sign({ ping: true }, privateKey, { algorithm: 'RS256', expiresIn: '1m' });
        jwt.verify(probe, publicKey, { algorithms: ['RS256'] });
    } catch (error) {
        return `${privateName} and ${publicName} do not form a valid key pair: ${error.message}`;
    }
    return null;
}
