import assert from 'node:assert/strict';
import { PrivateKey } from '@hiero-ledger/sdk';
import {
    createRemoteJoinDocument,
    openRemoteJoinMessageKey,
    openSealedBox,
    remoteJoinContext,
    sealToDidKey,
    verifyRemoteJoinProof,
} from '../../dist/remote-policy-join.js';
import {
    createRemoteUserProof,
    getDidEd25519PublicKey,
    getDidEd25519Seed,
    REMOTE_USER_PROOF_LIFETIME_MS,
    verifyRemoteUserProof,
} from '../../dist/remote-user-proof.js';
import { CommonDidDocument } from '../../dist/vcjs/did/common-did-document.js';
import { HederaEd25519Method } from '../../dist/vcjs/did/components/hedera-ed25519-method.js';

/*
 * A home instance joins a user to a policy of a Main instance by publishing a join
 * request signed with the user's DID key. The request carries the user's message key
 * for the policy, sealed to the DID key of the policy owner.
 */
async function didWithKeys(did) {
    const method = await HederaEd25519Method.generate(did, PrivateKey.generateED25519());
    const document = CommonDidDocument.from({
        '@context': 'https://www.w3.org/ns/did/v1',
        id: did,
        verificationMethod: [method.toObject(false)],
    });
    document.setPrivateKey(method.getId(), method.getPrivateKey());
    // what the other instance resolves from Hedera: the same document, without private keys
    const published = CommonDidDocument.from(document.getDocument());
    return { document, published };
}

const USER = 'did:hedera:testnet:user_0.0.5';
const OWNER = 'did:hedera:testnet:owner_0.0.7';
const POLICY = '1706823227.586179534';
const MESSAGE_KEY = PrivateKey.generate().toString();

describe('@unit remote policy join', function () {
    describe('sealed message key', () => {
        it('opens with the private key of the recipient DID', async () => {
            const { document, published } = await didWithKeys(OWNER);
            const context = remoteJoinContext(USER, POLICY);

            const box = sealToDidKey(MESSAGE_KEY, getDidEd25519PublicKey(published), context);

            assert.notEqual(box.data, Buffer.from(MESSAGE_KEY).toString('base64'));
            assert.equal(openSealedBox(box, getDidEd25519Seed(document).seed, context), MESSAGE_KEY);
        });

        it('uses a fresh ephemeral key every time', async () => {
            const { published } = await didWithKeys(OWNER);
            const context = remoteJoinContext(USER, POLICY);

            const a = sealToDidKey(MESSAGE_KEY, getDidEd25519PublicKey(published), context);
            const b = sealToDidKey(MESSAGE_KEY, getDidEd25519PublicKey(published), context);

            assert.notEqual(a.epk, b.epk);
            assert.notEqual(a.data, b.data);
        });

        it('does not open with another key', async () => {
            const { published } = await didWithKeys(OWNER);
            const { document: other } = await didWithKeys(OWNER);
            const context = remoteJoinContext(USER, POLICY);

            const box = sealToDidKey(MESSAGE_KEY, getDidEd25519PublicKey(published), context);

            assert.throws(() => openSealedBox(box, getDidEd25519Seed(other).seed, context), /Unable to open/);
        });

        it('does not open for another user, policy or a tampered box', async () => {
            const { document, published } = await didWithKeys(OWNER);
            const seed = getDidEd25519Seed(document).seed;
            const box = sealToDidKey(MESSAGE_KEY, getDidEd25519PublicKey(published), remoteJoinContext(USER, POLICY));

            assert.throws(() => openSealedBox(box, seed, remoteJoinContext('did:other', POLICY)), /Unable to open/);
            assert.throws(() => openSealedBox(box, seed, remoteJoinContext(USER, '1.2')), /Unable to open/);
            const data = Buffer.from(box.data, 'base64');
            data[0] ^= 1;
            assert.throws(
                () => openSealedBox({ ...box, data: data.toString('base64') }, seed, remoteJoinContext(USER, POLICY)),
                /Unable to open/
            );
            assert.throws(() => openSealedBox({ ...box, alg: 'none' }, seed, remoteJoinContext(USER, POLICY)), /Unsupported/);
        });
    });

    describe('join proof', () => {
        it('verifies a join signed by the DID and opens the key for the owner', async () => {
            const user = await didWithKeys(USER);
            const owner = await didWithKeys(OWNER);

            const join = createRemoteJoinDocument(user.document, owner.published, '0.0.100', '0.0.5', POLICY, MESSAGE_KEY);

            verifyRemoteJoinProof(join, user.published, '0.0.100', POLICY);
            assert.equal(openRemoteJoinMessageKey(join, owner.document), MESSAGE_KEY);
        });

        it('rejects a join signed by another key for the same DID', async () => {
            const user = await didWithKeys(USER);
            const forged = await didWithKeys(USER);
            const owner = await didWithKeys(OWNER);

            const join = createRemoteJoinDocument(forged.document, owner.published, '0.0.100', '0.0.5', POLICY, MESSAGE_KEY);

            assert.throws(() => verifyRemoteJoinProof(join, user.published, '0.0.100', POLICY), /Invalid join proof/);
        });

        it('rejects a join for another payer or policy', async () => {
            const user = await didWithKeys(USER);
            const owner = await didWithKeys(OWNER);
            const join = createRemoteJoinDocument(user.document, owner.published, '0.0.100', '0.0.5', POLICY, MESSAGE_KEY);

            assert.throws(() => verifyRemoteJoinProof(join, user.published, '0.0.200', POLICY), /does not match/);
            assert.throws(() => verifyRemoteJoinProof(join, user.published, '0.0.100', '1.2'), /does not match/);
            assert.throws(
                () => verifyRemoteJoinProof(
                    { ...join, proof: { ...join.proof, policyMessageId: '1.2' } },
                    user.published, '0.0.100', '1.2'
                ),
                /Invalid join proof/,
                'rewriting the signed policy breaks the signature'
            );
        });

        it('rejects a join whose sealed key was replaced', async () => {
            const user = await didWithKeys(USER);
            const owner = await didWithKeys(OWNER);
            const join = createRemoteJoinDocument(user.document, owner.published, '0.0.100', '0.0.5', POLICY, MESSAGE_KEY);
            const other = createRemoteJoinDocument(user.document, owner.published, '0.0.100', '0.0.5', POLICY, 'attacker-key');

            assert.throws(
                () => verifyRemoteJoinProof({ ...join, messageKey: other.messageKey }, user.published, '0.0.100', POLICY),
                /Invalid join proof/
            );
        });

        it('rejects a stale or future-dated join at the time it is checked', async () => {
            const user = await didWithKeys(USER);
            const owner = await didWithKeys(OWNER);
            const join = createRemoteJoinDocument(user.document, owner.published, '0.0.100', '0.0.5', POLICY, MESSAGE_KEY);
            const issued = Date.parse(join.proof.issued);

            assert.throws(
                () => verifyRemoteJoinProof(join, user.published, '0.0.100', POLICY, issued + REMOTE_USER_PROOF_LIFETIME_MS + 60 * 1000),
                /expired/
            );
            assert.throws(
                () => verifyRemoteJoinProof(join, user.published, '0.0.100', POLICY, issued - 60 * 60 * 1000),
                /Invalid join proof/
            );
        });

        it('rejects a registration proof used as a join proof, and the other way round', async () => {
            const user = await didWithKeys(USER);
            const owner = await didWithKeys(OWNER);
            const registration = createRemoteUserProof(user.document, '0.0.100', '0.0.5');
            const join = createRemoteJoinDocument(user.document, owner.published, '0.0.100', '0.0.5', POLICY, MESSAGE_KEY);

            const swapped = {
                ...join,
                proof: {
                    ...join.proof,
                    issued: registration.issued,
                    verificationMethod: registration.verificationMethod,
                    signature: registration.signature
                }
            };
            assert.throws(() => verifyRemoteJoinProof(swapped, user.published, '0.0.100', POLICY), /Invalid join proof/);

            const asRegistration = {
                did: join.proof.did,
                hederaAccountId: join.proof.hederaAccountId,
                topicId: join.proof.topicId,
                issued: join.proof.issued,
                verificationMethod: join.proof.verificationMethod,
                signature: join.proof.signature
            };
            assert.throws(
                () => verifyRemoteUserProof(asRegistration, user.published, '0.0.100', '0.0.5'),
                /Invalid registration proof/
            );
        });

        it('rejects a missing proof', async () => {
            const user = await didWithKeys(USER);

            assert.throws(() => verifyRemoteJoinProof(undefined, user.published, '0.0.100', POLICY), /missing/);
            assert.throws(() => verifyRemoteJoinProof({ proof: null }, user.published, '0.0.100', POLICY), /missing/);
        });

        it('refuses to seal to an owner without an Ed25519 key', async () => {
            const user = await didWithKeys(USER);
            const owner = CommonDidDocument.from({ '@context': 'https://www.w3.org/ns/did/v1', id: OWNER });

            assert.throws(
                () => createRemoteJoinDocument(user.document, owner, '0.0.100', '0.0.5', POLICY, MESSAGE_KEY),
                /no Ed25519 key/
            );
        });
    });
});
