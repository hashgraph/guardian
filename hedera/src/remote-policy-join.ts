import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { edwardsToMontgomeryPriv, edwardsToMontgomeryPub, x25519 } from '@noble/curves/ed25519';
import type { CommonDidDocument } from './vcjs/did/common-did-document.js';
import {
    checkProofIssued,
    getDidEd25519PublicKey,
    getDidEd25519Seed,
    signWithDidKey,
    verifyDidKeySignature
} from './remote-user-proof.js';

/**
 * Remote policy join.
 * A user of a home instance asks the Main instance to take part in a policy by
 * publishing a join message on the policy's actions topic. The message carries a
 * proof signed with the user's DID key and the user's message key for the policy,
 * sealed to the DID key of the policy owner.
 */

/**
 * Domain tag of the join proof, distinct from the registration proof tag
 */
const JOIN_PROOF_DOMAIN = 'guardian-remote-policy-join';

/**
 * HKDF info of the sealed message key
 */
const SEAL_INFO = 'guardian-remote-policy-join-key-v1';

/**
 * Sealing scheme name
 */
export const SEALED_BOX_ALGORITHM = 'X25519-HKDF-SHA256-A256GCM';

/**
 * Secret sealed to the Ed25519 DID key of the recipient
 */
export interface ISealedBox {
    alg: string;
    /**
     * Ephemeral X25519 public key, base64
     */
    epk: string;
    /**
     * AES-GCM nonce, base64
     */
    iv: string;
    /**
     * Cipher text followed by the 16-byte tag, base64
     */
    data: string;
}

/**
 * Join proof
 */
export interface IRemoteJoinProof {
    did: string;
    hederaAccountId: string;
    topicId: string;
    policyMessageId: string;
    issued: string;
    verificationMethod: string;
    signature: string;
}

/**
 * Join message document
 */
export interface IRemoteJoinDocument {
    proof: IRemoteJoinProof;
    messageKey: ISealedBox;
}

function sealKey(shared: Uint8Array, epk: Uint8Array, recipient: Uint8Array): Buffer {
    const salt = Buffer.concat([Buffer.from(epk), Buffer.from(recipient)]);
    return Buffer.from(hkdfSync('sha256', shared, salt, SEAL_INFO, 32));
}

/**
 * Seal a secret to the Ed25519 DID key of the recipient.
 * The Ed25519 key is converted to X25519, an ephemeral X25519 key agrees a shared
 * secret with it, HKDF derives an AES-256-GCM key, and the context is bound as
 * associated data, so a sealed box cannot be moved to another context.
 * @param secret
 * @param recipientPublicKey - Ed25519 public key
 * @param context - associated data
 */
export function sealToDidKey(secret: string, recipientPublicKey: Uint8Array, context: string): ISealedBox {
    const recipient = edwardsToMontgomeryPub(recipientPublicKey);
    const ephemeral = x25519.utils.randomPrivateKey();
    const epk = x25519.getPublicKey(ephemeral);
    const key = sealKey(x25519.getSharedSecret(ephemeral, recipient), epk, recipient);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(context, 'utf8'));
    const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return {
        alg: SEALED_BOX_ALGORITHM,
        epk: Buffer.from(epk).toString('base64'),
        iv: iv.toString('base64'),
        data: data.toString('base64')
    };
}

/**
 * Open a secret sealed to an Ed25519 DID key
 * @param box
 * @param recipientSeed - Ed25519 private key (32-byte seed)
 * @param context - associated data used when sealing
 */
export function openSealedBox(box: ISealedBox, recipientSeed: Uint8Array, context: string): string {
    if (!box || box.alg !== SEALED_BOX_ALGORITHM) {
        throw new Error('Unsupported message key format.');
    }
    try {
        const privateKey = edwardsToMontgomeryPriv(recipientSeed);
        const recipient = x25519.getPublicKey(privateKey);
        const epk = Buffer.from(box.epk, 'base64');
        const iv = Buffer.from(box.iv, 'base64');
        const data = Buffer.from(box.data, 'base64');
        if (epk.length !== 32 || iv.length !== 12 || data.length < 17) {
            throw new Error();
        }
        const key = sealKey(x25519.getSharedSecret(privateKey, epk), epk, recipient);
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAAD(Buffer.from(context, 'utf8'));
        decipher.setAuthTag(data.subarray(data.length - 16));
        return Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]).toString('utf8');
    } catch (error) {
        throw new Error('Unable to open the message key.');
    }
}

/**
 * Associated data of a sealed join message key
 * @param did
 * @param policyMessageId
 */
export function remoteJoinContext(did: string, policyMessageId: string): string {
    return JSON.stringify([JOIN_PROOF_DOMAIN, did, policyMessageId]);
}

function sealedBoxDigest(box: ISealedBox): string {
    return createHash('sha256')
        .update(JSON.stringify([box?.alg, box?.epk, box?.iv, box?.data]))
        .digest('base64');
}

function joinPayload(
    proof: Pick<IRemoteJoinProof, 'did' | 'hederaAccountId' | 'topicId' | 'policyMessageId' | 'issued'>,
    messageKey: ISealedBox
): Uint8Array {
    return new TextEncoder().encode(JSON.stringify([
        JOIN_PROOF_DOMAIN,
        proof.did,
        proof.hederaAccountId,
        proof.topicId,
        proof.policyMessageId,
        proof.issued,
        sealedBoxDigest(messageKey)
    ]));
}

/**
 * Create a join message document: seal the message key to the policy owner and
 * sign the join with the user's DID key
 * @param userDidDocument - user DID document with private keys
 * @param ownerDidDocument - policy owner DID document resolved from Hedera
 * @param hederaAccountId - user account, the payer of the join message
 * @param topicId - topic the user DID document is published to
 * @param policyMessageId
 * @param messageKey
 */
export function createRemoteJoinDocument(
    userDidDocument: CommonDidDocument,
    ownerDidDocument: CommonDidDocument,
    hederaAccountId: string,
    topicId: string,
    policyMessageId: string,
    messageKey: string
): IRemoteJoinDocument {
    const ownerKey = getDidEd25519PublicKey(ownerDidDocument);
    if (!ownerKey) {
        throw new Error('Policy owner DID document has no Ed25519 key.');
    }
    const did = userDidDocument.getDid();
    const sealed = sealToDidKey(messageKey, ownerKey, remoteJoinContext(did, policyMessageId));
    const proof = {
        did,
        hederaAccountId,
        topicId,
        policyMessageId,
        issued: new Date().toISOString(),
    };
    return {
        proof: {
            ...proof,
            ...signWithDidKey(userDidDocument, joinPayload(proof, sealed))
        },
        messageKey: sealed
    };
}

/**
 * Check that a join was signed by the DID and is bound to the policy and payer
 * @param document - join message document
 * @param didDocument - the user DID document resolved from Hedera
 * @param hederaAccountId - payer of the join message
 * @param policyMessageId - the policy the join was received for
 * @param at - time the join is checked at (the consensus time of the message)
 */
export function verifyRemoteJoinProof(
    document: IRemoteJoinDocument,
    didDocument: CommonDidDocument,
    hederaAccountId: string,
    policyMessageId: string,
    at: number = Date.now()
): void {
    const proof = document?.proof;
    if (!proof || typeof proof !== 'object' || !document.messageKey) {
        throw new Error('Join proof is missing.');
    }
    if (
        proof.did !== didDocument.getDid() ||
        proof.hederaAccountId !== hederaAccountId ||
        proof.policyMessageId !== policyMessageId
    ) {
        throw new Error('Join proof does not match the request.');
    }
    const issued = checkProofIssued(proof.issued, at);
    if (issued === 'invalid') {
        throw new Error('Invalid join proof.');
    }
    if (issued === 'expired') {
        throw new Error('Join proof has expired.');
    }
    if (!verifyDidKeySignature(
        didDocument,
        proof.verificationMethod,
        proof.signature,
        joinPayload(proof, document.messageKey)
    )) {
        throw new Error('Invalid join proof.');
    }
}

/**
 * Open the message key of a verified join with the policy owner DID document
 * @param document
 * @param ownerDidDocument - policy owner DID document with private keys
 */
export function openRemoteJoinMessageKey(
    document: IRemoteJoinDocument,
    ownerDidDocument: CommonDidDocument
): string {
    const { seed } = getDidEd25519Seed(ownerDidDocument);
    return openSealedBox(
        document.messageKey,
        seed,
        remoteJoinContext(document.proof.did, document.proof.policyMessageId)
    );
}
