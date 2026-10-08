import { ed25519 } from '@noble/curves/ed25519';
import { Hashing } from '../hedera-modules/hashing.js';
import type { CommonDidDocument } from '../hedera-modules/vcjs/did/common-did-document.js';
import { HederaEd25519Method } from '../hedera-modules/vcjs/did/components/hedera-ed25519-method.js';

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
const CLOCK_SKEW_MS = 5 * 60 * 1000;

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
    const method = didDocument.getMethodByType(HederaEd25519Method.TYPE);
    const privateKey = method?.toObject(true).privateKeyBase58;
    if (!privateKey) {
        throw new Error('DID key is not available.');
    }
    const proof = {
        did: didDocument.getDid(),
        hederaAccountId,
        topicId,
        issued: new Date().toISOString(),
    };
    // the stored secret is seed + public key, ed25519 signs with the 32-byte seed
    const seed = Hashing.base58.decode(privateKey).slice(0, 32);
    const signature = ed25519.sign(proofPayload(proof), seed);
    return {
        ...proof,
        verificationMethod: method.getId(),
        signature: Hashing.base58.encode(signature)
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
    const issued = Date.parse(proof.issued);
    const now = Date.now();
    if (Number.isNaN(issued) || issued > now + CLOCK_SKEW_MS) {
        throw new Error('Invalid registration proof.');
    }
    if (now - issued > REMOTE_USER_PROOF_LIFETIME_MS) {
        throw new Error('Registration proof has expired. Export the profile again from the home instance.');
    }
    const method = didDocument.getMethodByName(proof.verificationMethod);
    const publicKey = method?.getType() === HederaEd25519Method.TYPE
        ? method.toObject(false).publicKeyBase58
        : null;
    if (!publicKey) {
        throw new Error('Invalid registration proof.');
    }
    let valid = false;
    try {
        valid = ed25519.verify(
            Hashing.base58.decode(proof.signature),
            proofPayload(proof),
            Hashing.base58.decode(publicKey)
        );
    } catch (error) {
        valid = false;
    }
    if (!valid) {
        throw new Error('Invalid registration proof.');
    }
}
