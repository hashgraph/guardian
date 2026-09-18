import { assert } from 'chai';

import {
    PolicyDiffMessage,
    MessageAction,
    MessageType,
    MessageStatus,
    UrlType
} from '../../../../dist/hedera-modules/message/index.js';

describe('PolicyDiffMessage extra', function () {
    const diff = {
        uuid: 'uuid-1',
        owner: 'did:hedera:testnet:owner',
        diffType: 'backup',
        diffIndex: 3,
        policyTopicId: '0.0.111',
        instanceTopicId: '0.0.222'
    };

    const body = {
        id: 'msg-id',
        status: MessageStatus.ISSUE,
        type: MessageType.PolicyDiff,
        action: MessageAction.PublishPolicyDiff,
        lang: 'en-US',
        uuid: 'uuid-1',
        owner: 'did:hedera:testnet:owner',
        diffType: 'diff',
        diffIndex: 7,
        policyTopicId: '0.0.111',
        instanceTopicId: '0.0.222',
        cid: 'cidDiff'
    };

    it('constructor sets raw response type and empty urls', function () {
        const m = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        assert.equal(m.responseType, 'raw');
        assert.deepEqual(m.getUrls(), []);
    });

    it('setDocument maps diff fields and buffers the zip', function () {
        const m = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        m.setDocument(diff, Buffer.from('zip'));
        assert.equal(m.uuid, diff.uuid);
        assert.equal(m.owner, diff.owner);
        assert.equal(m.diffType, 'backup');
        assert.equal(m.diffIndex, 3);
        assert.equal(m.policyTopicId, diff.policyTopicId);
        assert.equal(m.instanceTopicId, diff.instanceTopicId);
        assert.equal(m.getDocument().toString(), 'zip');
    });

    it('setDocument without zip leaves document undefined', function () {
        const m = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        m.setDocument(diff);
        assert.isUndefined(m.getDocument());
    });

    it('toMessageObject maps fields and stringifies topic ids', function () {
        const m = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        m.setDocument({ ...diff, policyTopicId: { toString: () => '0.0.999' } });
        const obj = m.toMessageObject();
        assert.equal(obj.type, MessageType.PolicyDiff);
        assert.equal(obj.uuid, diff.uuid);
        assert.equal(obj.diffType, 'backup');
        assert.equal(obj.diffIndex, 3);
        assert.equal(obj.policyTopicId, '0.0.999');
        assert.equal(obj.instanceTopicId, '0.0.222');
        assert.isUndefined(obj.cid);
    });

    it('toDocuments returns the buffer when set and [] otherwise', async function () {
        const m = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        assert.deepEqual(await m.toDocuments(), []);
        m.setDocument(diff, Buffer.from('abc'));
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].toString(), 'abc');
    });

    it('loadDocuments stores a single document only', function () {
        const m = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        const result = m.loadDocuments(['payload']);
        assert.equal(result, m);
        assert.equal(m.getDocument().toString(), 'payload');
        const m2 = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        m2.loadDocuments(['a', 'b']);
        assert.isUndefined(m2.getDocument());
    });

    it('fromMessageObject with cid builds the ipfs url', function () {
        const m = PolicyDiffMessage.fromMessageObject(body);
        assert.equal(m.getDocumentUrl(UrlType.cid), 'cidDiff');
        assert.equal(m.getDocumentUrl(UrlType.url), 'ipfs://cidDiff');
    });

    it('fromMessageObject without cid keeps urls empty', function () {
        const m = PolicyDiffMessage.fromMessageObject({ ...body, cid: undefined });
        assert.deepEqual(m.getUrls(), []);
        assert.isUndefined(m.getUrl());
    });

    it('fromMessageObject maps the diff fields', function () {
        const m = PolicyDiffMessage.fromMessageObject(body);
        assert.equal(m.uuid, body.uuid);
        assert.equal(m.owner, body.owner);
        assert.equal(m.diffType, 'diff');
        assert.equal(m.diffIndex, 7);
        assert.equal(m.policyTopicId, body.policyTopicId);
        assert.equal(m.instanceTopicId, body.instanceTopicId);
    });

    it('getUrl returns the first url entry', function () {
        const m = PolicyDiffMessage.fromMessageObject(body);
        assert.deepEqual(m.getUrl(), { cid: 'cidDiff', url: 'ipfs://cidDiff' });
    });

    it('fromMessage parses a JSON string', function () {
        const m = PolicyDiffMessage.fromMessage(JSON.stringify(body));
        assert.equal(m.uuid, body.uuid);
        assert.equal(m.diffIndex, 7);
    });

    it('toJson exposes diff fields and the document', function () {
        const m = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        m.setDocument(diff, Buffer.from('zip'));
        const json = m.toJson();
        assert.equal(json.uuid, diff.uuid);
        assert.equal(json.owner, diff.owner);
        assert.equal(json.diffType, 'backup');
        assert.equal(json.diffIndex, 3);
        assert.equal(json.policyTopicId, diff.policyTopicId);
        assert.equal(json.instanceTopicId, diff.instanceTopicId);
        assert.equal(json.document.toString(), 'zip');
    });

    it('fromJson restores the diff fields', function () {
        const m = PolicyDiffMessage.fromJson({
            type: MessageType.PolicyDiff,
            action: MessageAction.PublishPolicyDiff,
            uuid: 'u',
            owner: 'o',
            diffType: 'keys',
            diffIndex: 1,
            policyTopicId: 't1',
            instanceTopicId: 't2',
            document: Buffer.from('d')
        });
        assert.equal(m.uuid, 'u');
        assert.equal(m.owner, 'o');
        assert.equal(m.diffType, 'keys');
        assert.equal(m.diffIndex, 1);
        assert.equal(m.policyTopicId, 't1');
        assert.equal(m.instanceTopicId, 't2');
        assert.equal(m.getDocument().toString(), 'd');
    });

    it('fromJson throws on empty input', function () {
        assert.throws(() => PolicyDiffMessage.fromJson(null), 'JSON Object is empty');
    });

    it('validate returns true and getOwner returns the owner', function () {
        const m = PolicyDiffMessage.fromMessageObject(body);
        assert.isTrue(m.validate());
        assert.equal(m.getOwner(), body.owner);
    });

    it('toMessage embeds the diff payload for ISSUE status', function () {
        const m = new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.PublishPolicyDiff);
        m.setDocument(diff, Buffer.from('x'));
        const parsed = JSON.parse(m.toMessage());
        assert.equal(parsed.type, MessageType.PolicyDiff);
        assert.equal(parsed.uuid, diff.uuid);
        assert.equal(parsed.diffType, 'backup');
        assert.equal(parsed.status, MessageStatus.ISSUE);
    });
});
