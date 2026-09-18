import { assert } from 'chai';
import { PolicyActionMessage } from '../../../dist/hedera-modules/message/policy-action-message.js';
import { MessageType } from '../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../dist/hedera-modules/message/message-action.js';

const action = MessageAction.PublishPolicy;

const model = {
    uuid: 'u', owner: 'o', policyId: 'p', accountId: 'a',
    relayerAccount: 'ra', blockTag: 'bt', startMessageId: 'parent',
};

describe('@unit PolicyActionMessage full', () => {
    it('setDocument copies action fields and the data document', () => {
        const m = new PolicyActionMessage(action);
        m.setDocument(model, { payload: 1 });
        assert.equal(m.uuid, 'u');
        assert.equal(m.parent, 'parent');
        assert.deepEqual(m.getDocument(), { payload: 1 });
    });

    it('toDocuments encrypts and loadDocuments decrypts the document', async () => {
        const m = new PolicyActionMessage(action);
        m.setDocument(model, { secret: 42 });
        const docs = await m.toDocuments('key');
        assert.equal(docs.length, 1);
        const out = await m.loadDocuments([docs[0].toString()], 'key');
        assert.deepEqual(out.document, { secret: 42 });
    });

    it('toMessageObject serializes the action body', () => {
        const m = new PolicyActionMessage(action);
        m.setDocument(model, {});
        const obj = m.toMessageObject();
        assert.equal(obj.type, MessageType.PolicyAction);
        assert.equal(obj.uuid, 'u');
        assert.equal(obj.policyId, 'p');
    });

    it('fromMessage/fromMessageObject round-trips with a cid url', () => {
        const m = new PolicyActionMessage(action);
        m.setDocument(model, {});
        const obj = { ...m.toMessageObject(), id: 'i', status: 's', cid: 'QmCid' };
        const restored = PolicyActionMessage.fromMessage(JSON.stringify(obj));
        assert.equal(restored.owner, 'o');
        assert.ok(restored.getUrl());
        assert.equal(restored.getDocumentUrl('cid'), 'QmCid');
    });

    it('static from populates payer/index/id/topic', () => {
        const m = new PolicyActionMessage(action);
        m.setDocument(model, {});
        const data = {
            message: JSON.stringify({ ...m.toMessageObject(), cid: 'QmCid' }),
            owner: 'payer', sequenceNumber: 3, consensusTimestamp: 'ts', topicId: '0.0.9',
        };
        const restored = PolicyActionMessage.from(data);
        assert.equal(restored.uuid, 'u');
    });

    it('empty-input guards on from / fromMessage / fromMessageObject / fromJson', () => {
        assert.throws(() => PolicyActionMessage.from(null), /Message Object is empty/);
        assert.throws(() => PolicyActionMessage.from({ message: '' }), /Message Object is empty/);
        assert.throws(() => PolicyActionMessage.fromMessage(''), /Message Object is empty/);
        assert.throws(() => PolicyActionMessage.fromMessageObject(null), /JSON Object is empty/);
        assert.throws(() => PolicyActionMessage.fromJson(null), /JSON Object is empty/);
    });

    it('validate is true and toJson/fromJson round-trips', () => {
        const m = new PolicyActionMessage(action);
        m.setDocument(model, { d: 1 });
        assert.isTrue(m.validate());
        const restored = PolicyActionMessage.fromJson(m.toJson());
        assert.equal(restored.uuid, 'u');
        assert.deepEqual(restored.document, { d: 1 });
    });
});
