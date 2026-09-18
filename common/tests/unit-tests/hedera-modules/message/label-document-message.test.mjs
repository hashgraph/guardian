import { assert } from 'chai';

import {
    LabelDocumentMessage,
    MessageAction,
    MessageType
} from '../../../../dist/hedera-modules/message/index.js';

describe('LabelDocumentMessage', function () {
    const body = {
        id: 'msgId',
        status: 'ISSUE',
        type: MessageType.VPDocument,
        action: MessageAction.CreateLabelDocument,
        issuer: 'did:hedera:testnet:issuer',
        relationships: ['rel1', 'rel2'],
        target: 'targetId',
        definition: 'defId',
        cid: 'testCid',
        url: 'ipfs://testCid'
    };

    it('default type is VPDocument', function () {
        const m = new LabelDocumentMessage(MessageAction.CreateLabelDocument);
        assert.equal(m.type, MessageType.VPDocument);
    });

    it('fromMessage throws on empty', function () {
        assert.throws(() => LabelDocumentMessage.fromMessage(null), 'Message Object is empty');
    });

    it('fromMessageObject throws on empty', function () {
        assert.throws(() => LabelDocumentMessage.fromMessageObject(null), 'JSON Object is empty');
    });

    it('fromJson throws on empty', function () {
        assert.throws(() => LabelDocumentMessage.fromJson(null), 'JSON Object is empty');
    });

    it('fromMessageObject maps fields', function () {
        const m = LabelDocumentMessage.fromMessageObject(body);
        assert.equal(m.action, MessageAction.CreateLabelDocument);
        assert.equal(m.issuer, body.issuer);
        assert.deepEqual(m.relationships, body.relationships);
        assert.equal(m.target, body.target);
        assert.equal(m.definition, body.definition);
    });

    it('fromMessage parses JSON string', function () {
        const m = LabelDocumentMessage.fromMessage(JSON.stringify(body));
        assert.equal(m.issuer, body.issuer);
    });

    it('getters return mapped values', function () {
        const m = LabelDocumentMessage.fromMessageObject(body);
        assert.deepEqual(m.getRelationships(), body.relationships);
        assert.equal(m.getTarget(), body.target);
        assert.equal(m.getDefinition(), body.definition);
        assert.equal(m.getOwner(), body.issuer);
    });

    it('getRelationships defaults to empty array', function () {
        const m = new LabelDocumentMessage(MessageAction.CreateLabelDocument);
        assert.deepEqual(m.getRelationships(), []);
    });

    it('setRelationships dedupes', function () {
        const m = new LabelDocumentMessage(MessageAction.CreateLabelDocument);
        m.setRelationships(['a', 'a', 'b']);
        assert.deepEqual(m.relationships, ['a', 'b']);
    });

    it('setTarget and setDefinition', function () {
        const m = new LabelDocumentMessage(MessageAction.CreateLabelDocument);
        m.setTarget('t');
        m.setDefinition({ messageId: 'def-msg' });
        assert.equal(m.getTarget(), 't');
        assert.equal(m.getDefinition(), 'def-msg');
    });

    it('validate returns true', function () {
        const m = LabelDocumentMessage.fromMessageObject(body);
        assert.isTrue(m.validate());
    });

    it('toMessageObject contains type/action/issuer', function () {
        const m = LabelDocumentMessage.fromMessageObject(body);
        const obj = m.toMessageObject();
        assert.equal(obj.type, MessageType.VPDocument);
        assert.equal(obj.action, MessageAction.CreateLabelDocument);
        assert.equal(obj.issuer, body.issuer);
        assert.equal(obj.target, body.target);
    });

    it('loadDocuments + getDocument', async function () {
        const m = new LabelDocumentMessage(MessageAction.CreateLabelDocument);
        await m.loadDocuments([JSON.stringify({ a: 1 })]);
        assert.deepEqual(m.getDocument(), { a: 1 });
    });

    it('toDocuments returns buffer', async function () {
        const m = new LabelDocumentMessage(MessageAction.CreateLabelDocument);
        await m.loadDocuments([JSON.stringify({ a: 1 })]);
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].toString(), JSON.stringify({ a: 1 }));
    });

    it('toJson then fromJson round-trips', function () {
        const m = LabelDocumentMessage.fromMessageObject(body);
        const json = m.toJson();
        const back = LabelDocumentMessage.fromJson(json);
        assert.equal(back.issuer, m.issuer);
        assert.deepEqual(back.relationships, m.relationships);
        assert.equal(back.target, m.target);
        assert.equal(back.definition, m.definition);
    });

    it('getDocumentUrl returns cid', function () {
        const m = LabelDocumentMessage.fromMessageObject(body);
        assert.equal(m.getUrl().cid, body.cid);
    });
});
