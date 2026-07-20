import { assert } from 'chai';
import { DIDMessage } from '../../../../dist/hedera-modules/message/did-message.js';
import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';

describe('DIDMessage relationships', () => {
    it('getRelationships defaults to an empty array', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        assert.deepEqual(m.getRelationships(), []);
    });

    it('setRelationships then getRelationships round-trips', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.setRelationships(['a', 'b']);
        assert.deepEqual(m.getRelationships(), ['a', 'b']);
    });
});

describe('DIDMessage.toMessageObject', () => {
    it('omits relationships when empty', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.did = 'did:1';
        m.setUrls([{ cid: 'c', url: 'ipfs://c' }]);
        const obj = m.toMessageObject();
        assert.equal(obj.did, 'did:1');
        assert.equal(obj.type, MessageType.DIDDocument);
        assert.notProperty(obj, 'relationships');
    });

    it('includes relationships when present', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.setUrls([{ cid: 'c', url: 'ipfs://c' }]);
        m.setRelationships(['r1']);
        const obj = m.toMessageObject();
        assert.deepEqual(obj.relationships, ['r1']);
    });

    it('embeds cid/uri from the first URL', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.setUrls([{ cid: 'c1', url: 'ipfs://c1' }]);
        const obj = m.toMessageObject();
        assert.equal(obj.cid, 'c1');
        assert.equal(obj.uri, 'ipfs://c1');
    });
});

describe('DIDMessage document handling', () => {
    it('getDocument returns the loaded document', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.loadDocuments([JSON.stringify({ name: 'n' })]);
        assert.deepEqual(m.getDocument(), { name: 'n' });
    });

    it('loadDocuments ignores non-array input', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.loadDocuments(null);
        assert.isUndefined(m.getDocument());
    });

    it('toDocuments serializes the document into a single buffer', async () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.document = { x: 1 };
        const docs = await m.toDocuments();
        assert.equal(docs.length, 1);
        assert.deepEqual(JSON.parse(docs[0].toString()), { x: 1 });
    });
});

describe('DIDMessage.fromJson / toJson', () => {
    it('fromJson throws on empty input', () => {
        assert.throws(() => DIDMessage.fromJson(null), /JSON Object is empty/);
    });

    it('round-trips did/relationships/document via toJson/fromJson', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.setId('id-1');
        m.did = 'did:9';
        m.relationships = ['x'];
        m.document = { a: 1 };
        const json = m.toJson();
        assert.equal(json.did, 'did:9');
        assert.deepEqual(json.relationships, ['x']);
        assert.deepEqual(json.document, { a: 1 });

        const back = DIDMessage.fromJson(json);
        assert.equal(back.did, 'did:9');
        assert.deepEqual(back.getRelationships(), ['x']);
        assert.deepEqual(back.getDocument(), { a: 1 });
    });
});

describe('DIDMessage misc', () => {
    it('getOwner returns the did', () => {
        const m = new DIDMessage(MessageAction.CreateDID);
        m.did = 'did:owner';
        assert.equal(m.getOwner(), 'did:owner');
    });

    it('validate returns true', () => {
        assert.isTrue(new DIDMessage(MessageAction.CreateDID).validate());
    });

    it('toHash is deterministic over status/type/action/lang/did', () => {
        const a = new DIDMessage(MessageAction.CreateDID);
        a.did = 'did:1';
        const b = new DIDMessage(MessageAction.CreateDID);
        b.did = 'did:1';
        assert.equal(a.toHash(), b.toHash());
    });

    it('toHash differs when did differs', () => {
        const a = new DIDMessage(MessageAction.CreateDID);
        a.did = 'did:1';
        const b = new DIDMessage(MessageAction.CreateDID);
        b.did = 'did:2';
        assert.notEqual(a.toHash(), b.toHash());
    });

    it('fromMessageObject maps did/relationships and builds a url from cid', () => {
        const m = DIDMessage.fromMessageObject({
            id: 'i',
            status: MessageStatus.ISSUE,
            type: MessageType.DIDDocument,
            action: MessageAction.CreateDID,
            did: 'did:5',
            cid: 'cidX',
            relationships: ['p']
        });
        assert.equal(m.did, 'did:5');
        assert.deepEqual(m.getRelationships(), ['p']);
        assert.equal(m.getUrl().cid, 'cidX');
    });
});
