import { ed25519 } from '@noble/curves/ed25519';
import { Hashing } from '@guardian/common/helpers/hashing';
import type { CommonDidDocument } from './vcjs/did/common-did-document.js';
import { didIdentifierOfKey, parseDid } from './did-identifier.js';
import { HederaEd25519Method } from './vcjs/did/components/hedera-ed25519-method.js';
import type { VerificationMethod } from './vcjs/did/components/verification-method.js';

/**
 * Remote user registration proof.
 * The DID, account and topic of a user are public, so a Main instance cannot tell
 * the user from anyone else registering them. The proof is a signature by the
 * DID's own Ed25519 key, which only the user's home instance holds.
 */
export interface IRemoteUserProof {
    did: string;
    hederaAccountId: string;
    topicId: string;
    issued: string;
    verificationMethod: string;
    signature: string;
}

/**
 * How long a proof is accepted after it was issued
 */
export const REMOTE_USER_PROOF_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * Tolerated clock difference between the two instances
 */
export const REMOTE_USER_PROOF_CLOCK_SKEW_MS = 5 * 60 * 1000;

function proofPayload(proof: Pick<IRemoteUserProof, 'did' | 'hederaAccountId' | 'topicId' | 'issued'>): Uint8Array {
    return new TextEncoder().encode(JSON.stringify([
        'guardian-remote-user',
        proof.did,
        proof.hederaAccountId,
        proof.topicId,
        proof.issued
    ]));
}

/**
 * Ed25519 private key (32-byte seed) of a DID document that holds its private keys
 * @param didDocument
 */
export function getDidEd25519Seed(didDocument: CommonDidDocument): { id: string, seed: Uint8Array } {
    // the signing side only has to find its own key: whoever verifies the signature
    // accepts nothing but the key the DID identifier is the hash of
    const method = getDidRootEd25519Method(didDocument)
        || didDocument.getMethodByName(didDocument.getDid() + HederaEd25519Method.DID_ROOT_KEY_NAME)
        || didDocument.getMethodByType(HederaEd25519Method.TYPE);
    const privateKey = method?.toObject(true).privateKeyBase58;
    if (!privateKey) {
        throw new Error('DID key is not available.');
    }
    // the stored secret is seed + public key, ed25519 signs with the 32-byte seed
    return { id: method.getId(), seed: Hashing.base58.decode(privateKey).slice(0, 32) };
}

/**
 * Root Ed25519 key of a DID document: the one the DID identifier is the hash of. It is the only key
 * that proves control of the DID, whatever the document names it, and a document can carry any other methods.
 * @param didDocument
 */
export function getDidRootEd25519Method(didDocument: CommonDidDocument): VerificationMethod | null {
    let identifier: string;
    try {
        identifier = parseDid(didDocument.getDid()).identifier;
    } catch (error) {
        return null;
    }
    for (const method of didDocument.getVerificationMethods()) {
        if (method.getType() !== HederaEd25519Method.TYPE) {
            continue;
        }
        try {
            const publicKey = Hashing.base58.decode(method.toObject(false).publicKeyBase58);
            if (didIdentifierOfKey(publicKey) === identifier) {
                return method;
            }
        } catch (error) {
            // not a key
        }
    }
    return null;
}

/**
 * Root Ed25519 public key of a DID document
 * @param didDocument
 * @param verificationMethod - method id the caller names, it has to be the root key method
 */
export function getDidEd25519PublicKey(didDocument: CommonDidDocument, verificationMethod?: string): Uint8Array | null {
    const method = getDidRootEd25519Method(didDocument);
    if (!method || (verificationMethod && verificationMethod !== method.getId())) {
        return null;
    }
    const publicKey = method.toObject(false).publicKeyBase58;
    if (!publicKey) {
        return null;
    }
    try {
        return Hashing.base58.decode(publicKey);
    } catch (error) {
        return null;
    }
}

/**
 * Sign a payload with the Ed25519 key of a DID document that holds its private keys
 * @param didDocument
 * @param payload
 */
export function signWithDidKey(
    didDocument: CommonDidDocument,
    payload: Uint8Array
): { verificationMethod: string, signature: string } {
    const { id, seed } = getDidEd25519Seed(didDocument);
    const signature = ed25519.sign(payload, seed);
    return {
        verificationMethod: id,
        signature: Hashing.base58.encode(signature)
    };
}

/**
 * Check a signature made with an Ed25519 key of a DID document
 * @param didDocument
 * @param verificationMethod
 * @param signature
 * @param payload
 */
export function verifyDidKeySignature(
    didDocument: CommonDidDocument,
    verificationMethod: string,
    signature: string,
    payload: Uint8Array
): boolean {
    if (typeof verificationMethod !== 'string' || typeof signature !== 'string') {
        return false;
    }
    const publicKey = getDidEd25519PublicKey(didDocument, verificationMethod);
    if (!publicKey) {
        return false;
    }
    try {
        return ed25519.verify(Hashing.base58.decode(signature), payload, publicKey);
    } catch (error) {
        return false;
    }
}

/**
 * Check the issue time of a proof
 * @param issued
 * @param now - the time the proof is checked at
 * @returns 'invalid' for an unparsable or future-dated time, 'expired' for a stale one
 */
export function checkProofIssued(issued: string, now: number = Date.now()): 'valid' | 'invalid' | 'expired' {
    const time = typeof issued === 'string' ? Date.parse(issued) : NaN;
    if (Number.isNaN(time) || time > now + REMOTE_USER_PROOF_CLOCK_SKEW_MS) {
        return 'invalid';
    }
    if (now - time > REMOTE_USER_PROOF_LIFETIME_MS) {
        return 'expired';
    }
    return 'valid';
}

/**
 * Sign a registration proof with the Ed25519 key of a DID document that holds its private keys
 * @param didDocument
 * @param hederaAccountId
 * @param topicId
 */
export function createRemoteUserProof(
    didDocument: CommonDidDocument,
    hederaAccountId: string,
    topicId: string
): IRemoteUserProof {
    const proof = {
        did: didDocument.getDid(),
        hederaAccountId,
        topicId,
        issued: new Date().toISOString(),
    };
    return {
        ...proof,
        ...signWithDidKey(didDocument, proofPayload(proof))
    };
}

/**
 * Check that a registration proof was signed by the DID and matches the registration
 * @param proof
 * @param didDocument - the DID document resolved from Hedera
 * @param hederaAccountId
 * @param topicId
 */
export function verifyRemoteUserProof(
    proof: IRemoteUserProof,
    didDocument: CommonDidDocument,
    hederaAccountId: string,
    topicId: string
): void {
    if (!proof || typeof proof !== 'object') {
        throw new Error('Registration proof is missing. Export the profile again from the home instance.');
    }
    if (
        proof.did !== didDocument.getDid() ||
        proof.hederaAccountId !== hederaAccountId ||
        proof.topicId !== topicId
    ) {
        throw new Error('Registration proof does not match the profile.');
    }
    const issued = checkProofIssued(proof.issued);
    if (issued === 'invalid') {
        throw new Error('Invalid registration proof.');
    }
    if (issued === 'expired') {
        throw new Error('Registration proof has expired. Export the profile again from the home instance.');
    }
    if (!verifyDidKeySignature(didDocument, proof.verificationMethod, proof.signature, proofPayload(proof))) {
        throw new Error('Invalid registration proof.');
    }
}
