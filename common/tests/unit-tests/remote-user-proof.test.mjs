import assert from 'node:assert/strict';
import { PrivateKey } from '@hiero-ledger/sdk';
import {
    createRemoteUserProof,
    verifyRemoteUserProof,
    REMOTE_USER_PROOF_LIFETIME_MS,
} from '../../dist/helpers/remote-user-proof.js';
import { CommonDidDocument } from '../../dist/hedera-modules/vcjs/did/common-did-document.js';
import { HederaEd25519Method } from '../../dist/hedera-modules/vcjs/did/components/hedera-ed25519-method.js';

/*
 * A DID, its account and its topic are all public, so anyone could register them as a
 * remote user on a Main instance. The proof is signed with the DID's Ed25519 key, which
 * only the home instance holds.
 */
async function didWithKeys(did = 'did:hedera:testnet:user_0.0.5') {
    const method = await HederaEd25519Method.generate(did, PrivateKey.generateED25519());
    const document = CommonDidDocument.from({
        '@context': 'https://www.w3.org/ns/did/v1',
        id: did,
        verificationMethod: [method.toObject(false)],
    });
    document.setPrivateKey(method.getId(), method.getPrivateKey());
    // what Main resolves from Hedera: the same document, without private keys
    const published = CommonDidDocument.from(document.getDocument());
    return { document, published };
}

describe('@unit remote user registration proof', function () {
    it('verifies a proof signed by the DID', async () => {
        const { document, published } = await didWithKeys();

        const proof = createRemoteUserProof(document, '0.0.100', '0.0.5');

        verifyRemoteUserProof(proof, published, '0.0.100', '0.0.5');
    });

    it('rejects a proof signed by another key for the same DID', async () => {
        const { published } = await didWithKeys();
        const { document: forged } = await didWithKeys();

        const proof = createRemoteUserProof(forged, '0.0.100', '0.0.5');

        assert.throws(() => verifyRemoteUserProof(proof, published, '0.0.100', '0.0.5'), /Invalid registration proof/);
    });

    it('rejects a proof moved to another account or topic', async () => {
        const { document, published } = await didWithKeys();
        const proof = createRemoteUserProof(document, '0.0.100', '0.0.5');

        assert.throws(() => verifyRemoteUserProof(proof, published, '0.0.200', '0.0.5'), /does not match/);
        assert.throws(() => verifyRemoteUserProof(proof, published, '0.0.100', '0.0.6'), /does not match/);
        assert.throws(
            () => verifyRemoteUserProof({ ...proof, hederaAccountId: '0.0.200' }, published, '0.0.200', '0.0.5'),
            /Invalid registration proof/,
            'rewriting the signed fields breaks the signature'
        );
    });

    it('rejects a missing proof', async () => {
        const { published } = await didWithKeys();

        assert.throws(() => verifyRemoteUserProof(undefined, published, '0.0.100', '0.0.5'), /proof is missing/);
    });

    it('rejects an expired or future-dated proof', async () => {
        const { document, published } = await didWithKeys();
        const realNow = Date.now;
        try {
            const proof = createRemoteUserProof(document, '0.0.100', '0.0.5');
            Date.now = () => realNow() + REMOTE_USER_PROOF_LIFETIME_MS + 60 * 1000;
            assert.throws(() => verifyRemoteUserProof(proof, published, '0.0.100', '0.0.5'), /expired/);

            Date.now = () => realNow() - 60 * 60 * 1000;
            assert.throws(() => verifyRemoteUserProof(proof, published, '0.0.100', '0.0.5'), /Invalid registration proof/);
        } finally {
            Date.now = realNow;
        }
    });

    it('refuses to sign without the DID private key', async () => {
        const { published } = await didWithKeys();

        assert.throws(() => createRemoteUserProof(published, '0.0.100', '0.0.5'), /DID key is not available/);
    });
});
