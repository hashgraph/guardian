import { assert } from 'chai';

import {
    PolicyRecordMessage,
    MessageAction,
    MessageType,
    MessageStatus,
    UrlType
} from '../../../../dist/hedera-modules/message/index.js';

describe('PolicyRecordMessage extra', function () {
    const model = {
        policyId: 'policy-1',
        policyMessageId: 'pm-1',
        recordingUuid: 'rec-uuid',
        recordId: 'rec-1',
        recordActionId: 'act-1',
        method: 'STEP',
        action: 'block-action',
        time: 12345,
        user: 'did:hedera:testnet:user',
        target: 'target-1'
    };

    const body = {
        id: 'msg-id',
        status: MessageStatus.ISSUE,
        type: MessageType.PolicyRecordStep,
        action: MessageAction.PolicyRecordStep,
        lang: 'en-US',
        policyId: 'policy-1',
        recordingUuid: 'rec-uuid',
        recordId: 'rec-1',
        recordActionId: 'act-1',
        method: 'STEP',
        time: 12345,
        cid: 'cidRec'
    };

    it('defaults to the PolicyRecordStep action and raw response type', function () {
        const m = new PolicyRecordMessage();
        assert.equal(m.action, MessageAction.PolicyRecordStep);
        assert.equal(m.type, MessageType.PolicyRecordStep);
        assert.equal(m.responseType, 'raw');
        assert.deepEqual(m.getUrls(), []);
    });

    it('setDocument maps all fields and buffers the zip', function () {
        const m = new PolicyRecordMessage();
        m.setDocument(model, Buffer.from('zip'));
        assert.equal(m.policyId, model.policyId);
        assert.equal(m.policyMessageId, model.policyMessageId);
        assert.equal(m.recordingUuid, model.recordingUuid);
        assert.equal(m.recordId, model.recordId);
        assert.equal(m.recordActionId, model.recordActionId);
        assert.equal(m.method, model.method);
        assert.equal(m.actionName, model.action);
        assert.equal(m.time, model.time);
        assert.equal(m.user, model.user);
        assert.equal(m.target, model.target);
        assert.equal(m.getDocument().toString(), 'zip');
    });

    it('setDocument defaults optional fields to null', function () {
        const m = new PolicyRecordMessage();
        m.setDocument({
            policyId: 'p',
            recordingUuid: 'ru',
            recordId: 'r',
            recordActionId: 'a',
            method: 'STEP',
            time: 1
        });
        assert.isNull(m.policyMessageId);
        assert.isNull(m.actionName);
        assert.isNull(m.user);
        assert.isNull(m.target);
        assert.isUndefined(m.getDocument());
    });

    it('toMessageObject maps the record fields', function () {
        const m = new PolicyRecordMessage();
        m.setDocument(model, Buffer.from('x'));
        const obj = m.toMessageObject();
        assert.equal(obj.type, MessageType.PolicyRecordStep);
        assert.equal(obj.policyId, model.policyId);
        assert.equal(obj.policyMessageId, model.policyMessageId);
        assert.equal(obj.recordingUuid, model.recordingUuid);
        assert.equal(obj.recordId, model.recordId);
        assert.equal(obj.recordActionId, model.recordActionId);
        assert.equal(obj.method, model.method);
        assert.equal(obj.actionName, model.action);
        assert.equal(obj.time, model.time);
        assert.equal(obj.user, model.user);
        assert.equal(obj.target, model.target);
        assert.isUndefined(obj.cid);
    });

    it('toDocuments returns the buffer when set and [] otherwise', async function () {
        const m = new PolicyRecordMessage();
        assert.deepEqual(await m.toDocuments(), []);
        m.setDocument(model, Buffer.from('doc'));
        const docs = await m.toDocuments();
        assert.lengthOf(docs, 1);
        assert.equal(docs[0].toString(), 'doc');
    });

    it('loadDocuments stores a single document only', function () {
        const m = new PolicyRecordMessage();
        const result = m.loadDocuments(['payload']);
        assert.equal(result, m);
        assert.equal(m.getDocument().toString(), 'payload');
        const m2 = new PolicyRecordMessage();
        m2.loadDocuments(['a', 'b']);
        assert.isUndefined(m2.getDocument());
    });

    it('fromMessageObject with cid builds the ipfs url', function () {
        const m = PolicyRecordMessage.fromMessageObject(body);
        assert.equal(m.getDocumentUrl(UrlType.cid), 'cidRec');
        assert.equal(m.getDocumentUrl(UrlType.url), 'ipfs://cidRec');
        assert.deepEqual(m.getUrl(), { cid: 'cidRec', url: 'ipfs://cidRec' });
    });

    it('fromMessageObject without cid keeps urls empty', function () {
        const m = PolicyRecordMessage.fromMessageObject({ ...body, cid: undefined });
        assert.deepEqual(m.getUrls(), []);
        assert.isUndefined(m.getUrl());
    });

    it('fromMessage parses a JSON string', function () {
        const m = PolicyRecordMessage.fromMessage(JSON.stringify(body));
        assert.equal(m.policyId, body.policyId);
        assert.equal(m.time, body.time);
    });

    it('validate requires policyId, recordingUuid and recordId', function () {
        const m = new PolicyRecordMessage();
        assert.isFalse(m.validate());
        m.policyId = 'p';
        m.recordingUuid = 'ru';
        assert.isFalse(m.validate());
        m.recordId = 'r';
        assert.isTrue(m.validate());
    });

    it('toJson exposes record fields and the document', function () {
        const m = new PolicyRecordMessage();
        m.setDocument(model, Buffer.from('zip'));
        const json = m.toJson();
        assert.equal(json.policyId, model.policyId);
        assert.equal(json.policyMessageId, model.policyMessageId);
        assert.equal(json.recordingUuid, model.recordingUuid);
        assert.equal(json.recordId, model.recordId);
        assert.equal(json.recordActionId, model.recordActionId);
        assert.equal(json.method, model.method);
        assert.equal(json.actionName, model.action);
        assert.equal(json.time, model.time);
        assert.equal(json.user, model.user);
        assert.equal(json.target, model.target);
        assert.equal(json.document.toString(), 'zip');
    });

    it('fromJson restores fields with nullish defaults', function () {
        const m = PolicyRecordMessage.fromJson({
            action: MessageAction.PolicyRecordStep,
            policyId: 'p',
            recordingUuid: 'ru',
            recordId: 'r',
            recordActionId: 'a',
            method: 'STEP',
            time: 9
        });
        assert.equal(m.policyId, 'p');
        assert.isNull(m.policyMessageId);
        assert.isNull(m.actionName);
        assert.isNull(m.user);
        assert.isNull(m.target);
    });

    it('fromJson throws on empty input', function () {
        assert.throws(() => PolicyRecordMessage.fromJson(null), 'JSON Object is empty');
    });

    it('getOwner returns the user or null', function () {
        const m = new PolicyRecordMessage();
        assert.isNull(m.getOwner());
        m.setDocument(model);
        assert.equal(m.getOwner(), model.user);
    });

    it('toMessage embeds the record payload for ISSUE status', function () {
        const m = new PolicyRecordMessage();
        m.setDocument(model, Buffer.from('x'));
        const parsed = JSON.parse(m.toMessage());
        assert.equal(parsed.type, MessageType.PolicyRecordStep);
        assert.equal(parsed.policyId, model.policyId);
        assert.equal(parsed.method, model.method);
        assert.equal(parsed.status, MessageStatus.ISSUE);
    });
});
