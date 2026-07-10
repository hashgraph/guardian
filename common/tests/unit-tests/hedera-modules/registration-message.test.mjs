import { assert } from 'chai';
import { RegistrationMessage } from '../../../dist/hedera-modules/message/registration-message.js';
import { MessageType } from '../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../dist/hedera-modules/message/message-action.js';

const body = (over = {}) => ({
    id: 'rid', status: 'ISSUE',
    type: MessageType.StandardRegistry, action: MessageAction.Init,
    lang: 'en-US', account: '0.0.7',
    did: 'did:registrant', topicId: '0.0.42', attributes: { geography: 'EU' }, ...over
});

describe('RegistrationMessage', () => {
    it('constructs with the StandardRegistry type', () => {
        const m = new RegistrationMessage(MessageAction.Init);
        assert.equal(m.type, MessageType.StandardRegistry);
    });

    it('setDocument stores did, registrant topic, lang and attributes', () => {
        const m = new RegistrationMessage(MessageAction.Init);
        m.setDocument('did:x', '0.0.5', { a: '1' });
        assert.equal(m.did, 'did:x');
        assert.equal(m.registrantTopicId, '0.0.5');
        assert.equal(m.lang, 'en-US');
        assert.deepEqual(m.attributes, { a: '1' });
    });

    it('setDocument defaults attributes to an empty object', () => {
        const m = new RegistrationMessage(MessageAction.Init);
        m.setDocument('did:x', '0.0.5');
        assert.deepEqual(m.attributes, {});
    });

    it('toMessageObject maps registrantTopicId to topicId', () => {
        const m = new RegistrationMessage(MessageAction.Init);
        m.setDocument('did:x', '0.0.5', { a: '1' });
        const obj = m.toMessageObject();
        assert.equal(obj.did, 'did:x');
        assert.equal(obj.topicId, '0.0.5');
        assert.deepEqual(obj.attributes, { a: '1' });
    });

    it('toDocuments resolves to []', async () => {
        assert.deepEqual(await new RegistrationMessage(MessageAction.Init).toDocuments(), []);
    });

    it('loadDocuments returns the instance', () => {
        const m = new RegistrationMessage(MessageAction.Init);
        assert.equal(m.loadDocuments([]), m);
    });

    it('validate is true and getUrls is empty', () => {
        const m = new RegistrationMessage(MessageAction.Init);
        assert.equal(m.validate(), true);
        assert.deepEqual(m.getUrls(), []);
    });

    it('fromMessage throws on an empty message', () => {
        assert.throws(() => RegistrationMessage.fromMessage(''), /Message Object is empty/);
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => RegistrationMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject throws on a wrong type', () => {
        assert.throws(() => RegistrationMessage.fromMessageObject(body({ type: 'Other' })), /Invalid message type/);
    });

    it('fromMessageObject maps did, topic and attributes', () => {
        const m = RegistrationMessage.fromMessageObject(body());
        assert.equal(m.did, 'did:registrant');
        assert.equal(m.registrantTopicId, '0.0.42');
        assert.deepEqual(m.attributes, { geography: 'EU' });
    });

    it('fromMessageObject defaults attributes to {} when absent', () => {
        const m = RegistrationMessage.fromMessageObject(body({ attributes: undefined }));
        assert.deepEqual(m.attributes, {});
    });

    it('toJson / fromJson round-trips registration fields', () => {
        const original = RegistrationMessage.fromMessageObject(body());
        const restored = RegistrationMessage.fromJson(original.toJson());
        assert.equal(restored.did, 'did:registrant');
        assert.equal(restored.registrantTopicId, '0.0.42');
        assert.deepEqual(restored.attributes, { geography: 'EU' });
    });
});
