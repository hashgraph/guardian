import { assert } from 'chai';
import esmock from 'esmock';
import { PrivateKey } from '@hiero-ledger/sdk';
import { ed25519 } from '@noble/curves/ed25519';
import { Hashing } from '@guardian/common/helpers/hashing';
import { HederaDidDocument } from '../../dist/vcjs/did/hedera-did-document.js';

/*
 * A remote user profile or join request names the topic and the account its DID document
 * is read from. The stored copy must be the one the account published on Hedera, and it
 * must belong to the DID: anyone can publish a document under any DID, and the identifier
 * of a Hedera DID is the hash of its root key.
 */
const TOPIC = '0.0.5';
const ACCOUNT = '0.0.100';

async function identity(topic = TOPIC) {
    const key = PrivateKey.generateED25519();
    const document = await HederaDidDocument.generate('testnet', key, topic);
    return { key, did: document.getDid(), json: document.toObject(false) };
}

async function load(messages, { getMessagesError, topicInfo = { submitKey: null }, topicInfoError, loadError } = {}) {
    const calls = { getMessages: [], loaded: [], tasks: [] };
    const module = await esmock('../../dist/published-did-document.js', {
        '../../dist/message/message-server.js': {
            MessageServer: class {
                static async getMessages(options) {
                    calls.getMessages.push(options);
                    if (getMessagesError) { throw getMessagesError; }
                    return messages;
                }
                static async loadDocument(message) {
                    calls.loaded.push(message);
                    if (loadError) { throw loadError; }
                    message.document = message.published;
                    return message;
                }
            },
        },
        '@guardian/common/helpers/workers': {
            Workers: class {
                async addRetryableTask(task) {
                    calls.tasks.push(task);
                    if (topicInfoError) { throw topicInfoError; }
                    return topicInfo;
                }
            },
        },
    });
    return { ...module, calls };
}

const didMessage = (did, payer, json) => ({
    did,
    payer,
    published: json,
    getDocument() { return this.document; },
});

async function rejection(promise) {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    return null;
}

describe('@unit resolvePublishedDidDocument', function () {
    // the first esmock load compiles the module graph and takes several seconds
    this.timeout(30000);

    it('returns the document the account published', async () => {
        const user = await identity();
        const { resolvePublishedDidDocument, calls } = await load([didMessage(user.did, ACCOUNT, user.json)]);

        const document = await resolvePublishedDidDocument(user.did, TOPIC, ACCOUNT, 'u1');

        assert.equal(document.getDid(), user.did);
        assert.equal(calls.getMessages[0].topicId, TOPIC);
    });

    it('rejects a DID published by a different account', async () => {
        const user = await identity();
        const { resolvePublishedDidDocument, calls } = await load([didMessage(user.did, '0.0.200', user.json)]);

        const error = await rejection(resolvePublishedDidDocument(user.did, TOPIC, ACCOUNT, 'u1'));

        assert.match(error?.message, /not published by the Hedera account/);
        assert.lengthOf(calls.loaded, 0, 'the forged document must not be loaded');
    });

    it('rejects a DID that is not on the topic', async () => {
        const user = await identity();
        const other = await identity();
        const { resolvePublishedDidDocument } = await load([didMessage(other.did, ACCOUNT, other.json)]);

        const error = await rejection(resolvePublishedDidDocument(user.did, TOPIC, ACCOUNT, 'u1'));

        assert.match(error?.message, /not published by the Hedera account/);
    });

    it('uses the latest document the account published', async () => {
        const user = await identity();
        const messages = [
            didMessage(user.did, ACCOUNT, user.json),
            didMessage(user.did, '0.0.200', user.json),
            didMessage(user.did, ACCOUNT, user.json),
        ];
        const { resolvePublishedDidDocument, calls } = await load(messages);

        await resolvePublishedDidDocument(user.did, TOPIC, ACCOUNT, 'u1');

        assert.strictEqual(calls.loaded[0], messages[2]);
    });

    it('rejects a missing topic and reports an unreadable one as temporary', async () => {
        const user = await identity();
        const { resolvePublishedDidDocument } = await load([], { getMessagesError: new Error('mirror') });

        assert.match((await rejection(resolvePublishedDidDocument(user.did, null, ACCOUNT, 'u1')))?.message, /Invalid topic/);
        const error = await rejection(resolvePublishedDidDocument(user.did, TOPIC, ACCOUNT, 'u1'));
        assert.match(error?.message, /Unable to read the DID topic/);
        assert.isTrue(error.transient);
    });

    it('reports a document that cannot be loaded as temporary', async () => {
        const user = await identity();
        const { resolvePublishedDidDocument } = await load([didMessage(user.did, ACCOUNT, user.json)], { loadError: new Error('ipfs') });

        const error = await rejection(resolvePublishedDidDocument(user.did, TOPIC, ACCOUNT, 'u1'));

        assert.isTrue(error.transient);
    });
});

describe('@unit a DID document must belong to its DID', function () {
    this.timeout(30000);

    it('rejects a document with another key published under the DID', async () => {
        const alice = await identity();
        const keyB = PrivateKey.generateED25519();
        const forged = (await HederaDidDocument.generateByDid(alice.did, keyB)).toObject(false);
        const { resolvePublishedDidDocument } = await load([didMessage(alice.did, '0.0.666', forged)]);

        const error = await rejection(resolvePublishedDidDocument(alice.did, TOPIC, '0.0.666', 'u1'));

        assert.match(error?.message, /does not match the DID/);
    });

    it('rejects a document published to a topic the DID does not name', async () => {
        const alice = await identity('0.0.9');
        const { resolvePublishedDidDocument } = await load([didMessage(alice.did, ACCOUNT, alice.json)]);

        const error = await rejection(resolvePublishedDidDocument(alice.did, TOPIC, ACCOUNT, 'u1'));

        assert.match(error?.message, /does not belong to the DID/);
    });

    it('does not accept a signature of an extra key added next to the root key of the DID', async () => {
        const { verifyDidKeySignature } = await import('../../dist/remote-user-proof.js');
        const { CommonDidDocument } = await import('../../dist/vcjs/did/common-did-document.js');
        const alice = await identity();
        const keyB = PrivateKey.generateED25519();
        const json = JSON.parse(JSON.stringify(alice.json));
        json.verificationMethod.push({
            id: alice.did + '#attacker',
            controller: alice.did,
            type: 'Ed25519VerificationKey2018',
            publicKeyBase58: Hashing.base58.encode(keyB.publicKey.toBytes()),
        });
        const document = CommonDidDocument.from(json);
        const payload = new TextEncoder().encode('join');
        const signature = Hashing.base58.encode(ed25519.sign(payload, keyB.toBytesRaw()));

        // the document is bound to the DID by its root key, the extra key does not count
        assert.isFalse(verifyDidKeySignature(document, alice.did + '#attacker', signature, payload));
        assert.isFalse(verifyDidKeySignature(document, alice.did + '#did-root-key', signature, payload));
    });
});

describe('@unit resolveOwnerDidDocument', function () {
    this.timeout(30000);

    it('accepts the first document of the DID on a topic with a submit key, whoever paid', async () => {
        const owner = await identity();
        const forgedKey = PrivateKey.generateED25519();
        const forged = (await HederaDidDocument.generateByDid(owner.did, forgedKey)).toObject(false);
        const { resolveOwnerDidDocument, calls } = await load([
            didMessage(owner.did, '0.0.300', owner.json),
            didMessage(owner.did, '0.0.100', forged),
        ], { topicInfo: { submitKey: 'key' } });

        const document = await resolveOwnerDidDocument(owner.did, TOPIC, ACCOUNT, 'u1');

        assert.equal(document.getDid(), owner.did, 'a later document for the same DID is ignored');
        assert.equal(calls.tasks[0].type, 'get-topic-info-rest');
        assert.equal(calls.tasks[0].data.topicId, TOPIC);
    });

    it('keeps the payer rule on a topic without a submit key', async () => {
        const owner = await identity();
        const { resolveOwnerDidDocument } = await load([
            didMessage(owner.did, '0.0.666', owner.json),
        ]);

        const error = await rejection(resolveOwnerDidDocument(owner.did, TOPIC, ACCOUNT, 'u1'));

        assert.match(error?.message, /not published by the Hedera account/);
    });

    it('rejects a topic it cannot read', async () => {
        const owner = await identity();
        const { resolveOwnerDidDocument } = await load([], { topicInfoError: new Error('mirror') });

        assert.match((await rejection(resolveOwnerDidDocument(owner.did, TOPIC, ACCOUNT, 'u1')))?.message, /Unable to read the DID topic/);
        assert.match((await rejection(resolveOwnerDidDocument(owner.did, null, ACCOUNT, 'u1')))?.message, /Invalid topic/);
    });

    it('does not ask for topic info when resolving a registering user', async () => {
        const user = await identity();
        const { resolvePublishedDidDocument, calls } = await load([didMessage(user.did, ACCOUNT, user.json)]);

        await resolvePublishedDidDocument(user.did, TOPIC, ACCOUNT, 'u1');

        assert.lengthOf(calls.tasks, 0);
    });
});

describe('@unit parseDid', function () {
    it('reads the topic of the current and of the old DID format', async () => {
        const { parseDid } = await import('../../dist/published-did-document.js');

        assert.deepEqual(parseDid('did:hedera:testnet:Abc_0.0.5'), { identifier: 'Abc', topicId: '0.0.5' });
        assert.deepEqual(
            parseDid('did:hedera:testnet:Abc;hedera:testnet:fid=0.0.3;hedera:testnet:tid=0.0.5'),
            { identifier: 'Abc', topicId: '0.0.5' }
        );
        assert.throws(() => parseDid('did:other:testnet:Abc_0.0.5'));
    });
});
