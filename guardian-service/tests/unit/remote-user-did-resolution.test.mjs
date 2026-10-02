import { assert } from 'chai';
import esmock from 'esmock';

/*
 * A remote user profile used to store whatever DID document the registrant supplied,
 * so anyone could register a document with keys of their choosing under another
 * user's DID. The stored copy must be the one the account published on Hedera.
 */
async function load(messages, { getMessagesError } = {}) {
    const calls = { getMessages: [], loaded: [] };
    const { resolvePublishedDidDocument } = await esmock(
        '../../dist/api/helpers/profile-helper.js',
        {
            '@guardian/common': {
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
                CommonDidDocument: {
                    from: (json) => ({
                        json,
                        getDid: () => json.id,
                        getMethodByType: () => ({}),
                    }),
                },
            },
        }
    );
    return { resolvePublishedDidDocument, calls };
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
        assert.match((await rejection(resolvePublishedDidDocument('did:user', '0.0.5', '0.0.100', 'u1')))?.message, /Invalid topic/);
    });
});
