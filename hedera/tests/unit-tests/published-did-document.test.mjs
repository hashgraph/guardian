import { assert } from 'chai';
import esmock from 'esmock';

/*
 * A remote user profile used to store whatever DID document the registrant supplied,
 * so anyone could register a document with keys of their choosing under another
 * user's DID. The stored copy must be the one the account published on Hedera.
 */
async function load(messages, { getMessagesError, topicInfo = { submitKey: null }, topicInfoError } = {}) {
    const calls = { getMessages: [], loaded: [], tasks: [] };
    const { resolvePublishedDidDocument, resolveOwnerDidDocument } = await esmock(
        '../../dist/published-did-document.js',
        {
            '../../dist/message/message-server.js': {
                MessageServer: class {
                    static async getMessages(options) {
                        calls.getMessages.push(options);
                        if (getMessagesError) { throw getMessagesError; }
                        return messages;
                    }
                    static async loadDocument(message) {
                        calls.loaded.push(message);
                        message.document = message.published;
                        return message;
                    }
                },
            },
            '../../dist/vcjs/did/common-did-document.js': {
                CommonDidDocument: {
                    from: (json) => ({
                        json,
                        getDid: () => json.id,
                        getMethodByType: () => ({}),
                    }),
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
            '@guardian/interfaces': { WorkerTaskType: { GET_TOPIC_INFO_REST: 'get-topic-info-rest' } },
        }
    );
    return { resolvePublishedDidDocument, resolveOwnerDidDocument, calls };
}

const didMessage = (did, payer, keys) => ({
    did,
    payer,
    published: { id: did, keys },
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

    it('returns the document the account published, not the supplied one', async () => {
        const { resolvePublishedDidDocument, calls } = await load([
            didMessage('did:user', '0.0.100', 'published-keys'),
        ]);

        const document = await resolvePublishedDidDocument('did:user', '0.0.5', '0.0.100', 'u1');

        assert.equal(document.json.keys, 'published-keys');
        assert.equal(calls.getMessages[0].topicId, '0.0.5');
    });

    it('rejects a DID published by a different account', async () => {
        const { resolvePublishedDidDocument, calls } = await load([
            didMessage('did:user', '0.0.200', 'published-keys'),
        ]);

        const error = await rejection(resolvePublishedDidDocument('did:user', '0.0.5', '0.0.100', 'u1'));

        assert.match(error?.message, /not published by the Hedera account/);
        assert.lengthOf(calls.loaded, 0, 'the forged document must not be loaded');
    });

    it('rejects a DID that is not on the topic', async () => {
        const { resolvePublishedDidDocument } = await load([
            didMessage('did:other', '0.0.100', 'published-keys'),
        ]);

        const error = await rejection(resolvePublishedDidDocument('did:user', '0.0.5', '0.0.100', 'u1'));

        assert.match(error?.message, /not published by the Hedera account/);
    });

    it('uses the latest document the account published', async () => {
        const { resolvePublishedDidDocument } = await load([
            didMessage('did:user', '0.0.100', 'old-keys'),
            didMessage('did:user', '0.0.200', 'foreign-keys'),
            didMessage('did:user', '0.0.100', 'new-keys'),
        ]);

        const document = await resolvePublishedDidDocument('did:user', '0.0.5', '0.0.100', 'u1');

        assert.equal(document.json.keys, 'new-keys');
    });

    it('rejects a missing or unreadable topic', async () => {
        const { resolvePublishedDidDocument } = await load([], { getMessagesError: new Error('mirror') });

        assert.match((await rejection(resolvePublishedDidDocument('did:user', null, '0.0.100', 'u1')))?.message, /Invalid topic/);
        assert.match((await rejection(resolvePublishedDidDocument('did:user', '0.0.5', '0.0.100', 'u1')))?.message, /Unable to read the DID topic 0\.0\.5.*mirror/);
    });
});

/*
 * The DID topic of a Standard Registry normally has a submit key, so only the instance
 * holding it can post: which account paid does not matter. Other users of that instance
 * post their own DID documents to the same topic, and DID documents are never updated,
 * so a later document claiming the owner's DID is a forgery. An open topic keeps the payer rule.
 */
describe('@unit resolveOwnerDidDocument', function () {
    this.timeout(30000);

    it('accepts the first document of the DID on a topic with a submit key, whoever paid', async () => {
        const { resolveOwnerDidDocument, calls } = await load([
            didMessage('did:other', '0.0.300', 'other-keys'),
            didMessage('did:owner', '0.0.300', 'owner-keys'),
            didMessage('did:owner', '0.0.100', 'later-keys'),
        ], { topicInfo: { submitKey: 'key' } });

        const document = await resolveOwnerDidDocument('did:owner', '0.0.7', '0.0.100', 'u1');

        assert.equal(document.json.keys, 'owner-keys', 'a later document for the same DID is ignored');
        assert.equal(calls.tasks[0].type, 'get-topic-info-rest');
        assert.equal(calls.tasks[0].data.topicId, '0.0.7');
    });

    it('keeps the payer rule on a topic without a submit key', async () => {
        const { resolveOwnerDidDocument } = await load([
            didMessage('did:owner', '0.0.100', 'owner-keys'),
            didMessage('did:owner', '0.0.666', 'forged-keys'),
        ]);

        const document = await resolveOwnerDidDocument('did:owner', '0.0.7', '0.0.100', 'u1');

        assert.equal(document.json.keys, 'owner-keys');
    });

    it('rejects an open topic without a document from the payer', async () => {
        const { resolveOwnerDidDocument } = await load([didMessage('did:owner', '0.0.666', 'forged-keys')]);

        const error = await rejection(resolveOwnerDidDocument('did:owner', '0.0.7', '0.0.100', 'u1'));

        assert.match(error?.message, /not published by the Hedera account/);
    });

    it('rejects a topic it cannot read', async () => {
        const { resolveOwnerDidDocument } = await load([], { topicInfoError: new Error('mirror') });

        assert.match((await rejection(resolveOwnerDidDocument('did:owner', '0.0.7', '0.0.100', 'u1')))?.message, /Unable to read the DID topic 0\.0\.7.*mirror/);
        assert.match((await rejection(resolveOwnerDidDocument('did:owner', null, '0.0.100', 'u1')))?.message, /Invalid topic/);
    });

    it('does not ask for topic info when resolving a registering user', async () => {
        const { resolvePublishedDidDocument, calls } = await load([didMessage('did:user', '0.0.100', 'keys')]);

        await resolvePublishedDidDocument('did:user', '0.0.5', '0.0.100', 'u1');

        assert.lengthOf(calls.tasks, 0);
    });
});
