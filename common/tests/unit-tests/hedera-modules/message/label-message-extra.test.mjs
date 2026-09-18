import { assert } from 'chai';

import {
    LabelMessage,
    MessageAction,
    MessageType,
    MessageStatus,
    UrlType
} from '../../../../dist/hedera-modules/message/index.js';

describe('LabelMessage extra', function () {
    const item = {
        name: 'Label 1',
        description: 'desc',
        owner: 'did:hedera:testnet:owner',
        uuid: 'uuid-1',
        policyTopicId: '0.0.111',
        policyInstanceTopicId: '0.0.222'
    };

    const body = {
        id: 'msg-id',
        status: MessageStatus.ISSUE,
        type: MessageType.PolicyLabel,
        action: MessageAction.PublishPolicyLabel,
        lang: 'en-US',
        name: 'Label 1',
        description: 'desc',
        owner: 'did:hedera:testnet:owner',
        uuid: 'uuid-1',
        policyTopicId: '0.0.111',
        policyInstanceTopicId: '0.0.222',
        cid: 'cid123'
    };

    it('setDocument copies fields and stores the zip as a Buffer', function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        m.setDocument(item, Buffer.from('zip-data'));
        assert.equal(m.name, item.name);
        assert.equal(m.description, item.description);
        assert.equal(m.owner, item.owner);
        assert.equal(m.uuid, item.uuid);
        assert.equal(m.policyTopicId, item.policyTopicId);
        assert.equal(m.policyInstanceTopicId, item.policyInstanceTopicId);
        assert.isTrue(Buffer.isBuffer(m.config));
        assert.equal(m.config.toString(), 'zip-data');
    });

    it('setDocument accepts an ArrayBuffer zip', function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        const source = Buffer.from('abc');
        const arrayBuffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
        m.setDocument(item, arrayBuffer);
        assert.isTrue(Buffer.isBuffer(m.config));
        assert.equal(m.config.toString(), 'abc');
    });

    it('getDocument returns the stored buffer', function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        m.setDocument(item, Buffer.from('zzz'));
        assert.equal(m.getDocument().toString(), 'zzz');
    });

    it('toDocuments resolves to the config buffer when set', async function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        m.setDocument(item, Buffer.from('doc'));
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].toString(), 'doc');
    });

    it('toDocuments resolves to an empty array when no config', async function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        const docs = await m.toDocuments();
        assert.deepEqual(docs, []);
    });

    it('loadDocuments stores a single document as a Buffer and returns this', function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        const result = m.loadDocuments(['payload']);
        assert.equal(result, m);
        assert.isTrue(Buffer.isBuffer(m.config));
        assert.equal(m.config.toString(), 'payload');
    });

    it('loadDocuments ignores arrays with more than one document', function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        m.loadDocuments(['a', 'b']);
        assert.isUndefined(m.config);
    });

    it('loadDocuments ignores null input', function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        m.loadDocuments(null);
        assert.isUndefined(m.config);
    });

    it('toMessageObject exposes mapped fields and cid/uri after fromMessageObject', function () {
        const m = LabelMessage.fromMessageObject(body);
        const obj = m.toMessageObject();
        assert.equal(obj.type, MessageType.PolicyLabel);
        assert.equal(obj.name, body.name);
        assert.equal(obj.description, body.description);
        assert.equal(obj.owner, body.owner);
        assert.equal(obj.uuid, body.uuid);
        assert.equal(obj.policyTopicId, body.policyTopicId);
        assert.equal(obj.policyInstanceTopicId, body.policyInstanceTopicId);
        assert.equal(obj.cid, 'cid123');
        assert.equal(obj.uri, 'ipfs://cid123');
    });

    it('fromMessageObject drops the url entry when cid is missing', function () {
        const m = LabelMessage.fromMessageObject({ ...body, cid: undefined });
        assert.deepEqual(m.getUrls(), []);
        assert.isUndefined(m.getDocumentUrl(UrlType.cid));
    });

    it('getUrl returns the same array as getUrls', function () {
        const m = LabelMessage.fromMessageObject(body);
        assert.deepEqual(m.getUrl(), m.getUrls());
    });

    it('getDocumentUrl and getContextUrl read url slots 0 and 1', function () {
        const m = LabelMessage.fromMessageObject(body);
        assert.equal(m.getDocumentUrl(UrlType.cid), 'cid123');
        assert.equal(m.getDocumentUrl(UrlType.url), 'ipfs://cid123');
        assert.isUndefined(m.getContextUrl(UrlType.cid));
    });

    it('validate always returns true', function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        assert.isTrue(m.validate());
    });

    it('fromJson restores the label fields', function () {
        const m = LabelMessage.fromJson({
            action: MessageAction.PublishPolicyLabel,
            name: 'n',
            description: 'd',
            owner: 'o',
            uuid: 'u',
            policyTopicId: 't1',
            policyInstanceTopicId: 't2',
            config: Buffer.from('cfg')
        });
        assert.equal(m.name, 'n');
        assert.equal(m.description, 'd');
        assert.equal(m.owner, 'o');
        assert.equal(m.uuid, 'u');
        assert.equal(m.policyTopicId, 't1');
        assert.equal(m.policyInstanceTopicId, 't2');
        assert.equal(m.config.toString(), 'cfg');
    });

    it('getOwner returns the owner did', function () {
        const m = LabelMessage.fromMessageObject(body);
        assert.equal(m.getOwner(), body.owner);
    });

    it('toMessage embeds the label payload for ISSUE status', function () {
        const m = new LabelMessage(MessageAction.PublishPolicyLabel);
        m.setDocument(item, Buffer.from('x'));
        const parsed = JSON.parse(m.toMessage());
        assert.equal(parsed.status, MessageStatus.ISSUE);
        assert.equal(parsed.type, MessageType.PolicyLabel);
        assert.equal(parsed.name, item.name);
        assert.equal(parsed.uuid, item.uuid);
    });

    it('fromMessage with REVOKE status restores the revoke reason', function () {
        const m = LabelMessage.fromMessage(JSON.stringify({
            ...body,
            status: MessageStatus.REVOKE,
            revokeMessage: 'revoked!',
            reason: 'Document Revoked'
        }));
        assert.isTrue(m.isRevoked());
    });
});
