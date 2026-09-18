import { assert } from 'chai';

import {
    StatisticMessage,
    MessageAction,
    MessageType,
    MessageStatus,
    UrlType
} from '../../../../dist/hedera-modules/message/index.js';

describe('StatisticMessage extra', function () {
    const item = {
        name: 'Statistic 1',
        description: 'desc',
        owner: 'did:hedera:testnet:owner',
        uuid: 'uuid-1',
        policyTopicId: '0.0.111',
        policyInstanceTopicId: '0.0.222',
        config: { rules: [{ id: 'r1' }], formulas: [] }
    };

    const body = {
        id: 'msg-id',
        status: MessageStatus.ISSUE,
        type: MessageType.PolicyStatistic,
        action: MessageAction.PublishPolicyStatistic,
        lang: 'en-US',
        name: 'Statistic 1',
        description: 'desc',
        owner: 'did:hedera:testnet:owner',
        uuid: 'uuid-1',
        policyTopicId: '0.0.111',
        policyInstanceTopicId: '0.0.222',
        cid: 'cid777'
    };

    it('setDocument copies fields and keeps the config object', function () {
        const m = new StatisticMessage(MessageAction.PublishPolicyStatistic);
        m.setDocument(item);
        assert.equal(m.name, item.name);
        assert.equal(m.description, item.description);
        assert.equal(m.owner, item.owner);
        assert.equal(m.uuid, item.uuid);
        assert.equal(m.policyTopicId, item.policyTopicId);
        assert.equal(m.policyInstanceTopicId, item.policyInstanceTopicId);
        assert.deepEqual(m.config, item.config);
    });

    it('getDocument returns the config', function () {
        const m = new StatisticMessage(MessageAction.PublishPolicyStatistic);
        m.setDocument(item);
        assert.deepEqual(m.getDocument(), item.config);
    });

    it('toDocuments serializes the config to a JSON buffer', async function () {
        const m = new StatisticMessage(MessageAction.PublishPolicyStatistic);
        m.setDocument(item);
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 1);
        assert.deepEqual(JSON.parse(docs[0].toString()), item.config);
    });

    it('loadDocuments parses the first document', function () {
        const m = new StatisticMessage(MessageAction.PublishPolicyStatistic);
        const result = m.loadDocuments([JSON.stringify({ a: 1 })]);
        assert.equal(result, m);
        assert.deepEqual(m.config, { a: 1 });
    });

    it('loadDocuments ignores non-array input', function () {
        const m = new StatisticMessage(MessageAction.PublishPolicyStatistic);
        m.loadDocuments('not-an-array');
        assert.isUndefined(m.config);
    });

    it('toMessageObject exposes mapped fields with cid/uri', function () {
        const m = StatisticMessage.fromMessageObject(body);
        const obj = m.toMessageObject();
        assert.equal(obj.type, MessageType.PolicyStatistic);
        assert.equal(obj.name, body.name);
        assert.equal(obj.owner, body.owner);
        assert.equal(obj.uuid, body.uuid);
        assert.equal(obj.policyTopicId, body.policyTopicId);
        assert.equal(obj.policyInstanceTopicId, body.policyInstanceTopicId);
        assert.equal(obj.cid, 'cid777');
        assert.equal(obj.uri, 'ipfs://cid777');
    });

    it('fromMessageObject drops the url entry when cid is missing', function () {
        const m = StatisticMessage.fromMessageObject({ ...body, cid: undefined });
        assert.deepEqual(m.getUrls(), []);
        assert.isUndefined(m.getDocumentUrl(UrlType.cid));
    });

    it('getUrl returns the same array as getUrls', function () {
        const m = StatisticMessage.fromMessageObject(body);
        assert.deepEqual(m.getUrl(), m.getUrls());
    });

    it('getDocumentUrl and getContextUrl read url slots 0 and 1', function () {
        const m = StatisticMessage.fromMessageObject(body);
        assert.equal(m.getDocumentUrl(UrlType.cid), 'cid777');
        assert.equal(m.getDocumentUrl(UrlType.url), 'ipfs://cid777');
        assert.isUndefined(m.getContextUrl(UrlType.url));
    });

    it('validate always returns true', function () {
        const m = new StatisticMessage(MessageAction.PublishPolicyStatistic);
        assert.isTrue(m.validate());
    });

    it('fromJson restores the statistic fields', function () {
        const m = StatisticMessage.fromJson({
            action: MessageAction.PublishPolicyStatistic,
            name: 'n',
            description: 'd',
            owner: 'o',
            uuid: 'u',
            policyTopicId: 't1',
            policyInstanceTopicId: 't2',
            config: { rules: [] }
        });
        assert.equal(m.name, 'n');
        assert.equal(m.description, 'd');
        assert.equal(m.owner, 'o');
        assert.equal(m.uuid, 'u');
        assert.equal(m.policyTopicId, 't1');
        assert.equal(m.policyInstanceTopicId, 't2');
        assert.deepEqual(m.config, { rules: [] });
    });

    it('getOwner returns the owner did', function () {
        const m = StatisticMessage.fromMessageObject(body);
        assert.equal(m.getOwner(), body.owner);
    });

    it('toMessage embeds the statistic payload for ISSUE status', function () {
        const m = new StatisticMessage(MessageAction.PublishPolicyStatistic);
        m.setDocument(item);
        const parsed = JSON.parse(m.toMessage());
        assert.equal(parsed.status, MessageStatus.ISSUE);
        assert.equal(parsed.type, MessageType.PolicyStatistic);
        assert.equal(parsed.name, item.name);
        assert.equal(parsed.uuid, item.uuid);
    });

    it('toMessage / fromMessage round-trips the scalar fields', function () {
        const m = new StatisticMessage(MessageAction.PublishPolicyStatistic);
        m.setDocument(item);
        const restored = StatisticMessage.fromMessage(m.toMessage());
        assert.equal(restored.name, item.name);
        assert.equal(restored.owner, item.owner);
        assert.equal(restored.policyTopicId, item.policyTopicId);
    });

    it('fromMessage with REVOKE status restores the revoked flag', function () {
        const m = StatisticMessage.fromMessage(JSON.stringify({
            ...body,
            status: MessageStatus.REVOKE,
            revokeMessage: 'gone',
            reason: 'Document Revoked'
        }));
        assert.isTrue(m.isRevoked());
    });
});
