import { assert } from 'chai';
import { MessageServer } from '../../../../dist/hedera-modules/message/message-server.js';
import { MessageStatus } from '../../../../dist/hedera-modules/message/message.js';
import { MessageType } from '../../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../../dist/hedera-modules/message/message-action.js';
import { TopicMessage } from '../../../../dist/hedera-modules/message/topic-message.js';
import { VCMessage } from '../../../../dist/hedera-modules/message/vc-message.js';
import { DIDMessage } from '../../../../dist/hedera-modules/message/did-message.js';
import { PolicyMessage } from '../../../../dist/hedera-modules/message/policy-message.js';
import { RegistrationMessage } from '../../../../dist/hedera-modules/message/registration-message.js';

const topicBody = () => ({
    id: 'mid',
    status: MessageStatus.ISSUE,
    type: MessageType.Topic,
    action: MessageAction.CreateTopic,
    name: 'name',
    description: 'desc',
    owner: 'did:owner',
    messageType: 'POLICY_TOPIC',
    childId: 'c',
    parentId: 'p',
    rationale: 'r',
    lang: 'en'
});

const vcBody = () => ({
    id: 'mid',
    status: MessageStatus.ISSUE,
    type: MessageType.VCDocument,
    action: MessageAction.CreateVC,
    issuer: 'did:issuer',
    cid: 'cid',
    url: 'ipfs://cid',
    relationships: ['a']
});

const didBody = () => ({
    id: 'mid',
    status: MessageStatus.ISSUE,
    type: MessageType.DIDDocument,
    action: MessageAction.CreateDID,
    did: 'did:x',
    cid: 'cid',
    url: 'ipfs://cid'
});

const policyBody = () => ({
    id: 'mid',
    status: MessageStatus.ISSUE,
    type: MessageType.Policy,
    action: MessageAction.CreatePolicy,
    uuid: 'uuid',
    name: 'p',
    description: 'd',
    topicDescription: 'td',
    version: '1.0.0',
    policyTag: 'tag',
    owner: 'did:o',
    topicId: '0.0.1',
    instanceTopicId: '0.0.2',
    cid: 'cid',
    url: 'ipfs://cid'
});

const registrationBody = () => ({
    id: 'mid',
    status: MessageStatus.ISSUE,
    type: MessageType.StandardRegistry,
    action: MessageAction.Init,
    did: 'did:sr',
    topicId: '0.0.3',
    lang: 'en',
    attributes: { a: '1' }
});

describe('MessageServer.setLang', () => {
    it('stores the language statically', () => {
        const saved = MessageServer.lang;
        MessageServer.setLang('cn');
        assert.equal(MessageServer.lang, 'cn');
        MessageServer.setLang(saved);
    });
});

describe('MessageServer.fromMessage', () => {
    it('parses a topic message string', () => {
        const message = MessageServer.fromMessage(JSON.stringify(topicBody()), null);
        assert.instanceOf(message, TopicMessage);
        assert.equal(message.name, 'name');
    });

    it('parses a vc message string', () => {
        const message = MessageServer.fromMessage(JSON.stringify(vcBody()), null);
        assert.instanceOf(message, VCMessage);
        assert.equal(message.issuer, 'did:issuer');
    });

    it('throws for a malformed string', () => {
        assert.throws(() => MessageServer.fromMessage('{bad', null));
    });
});

describe('MessageServer.fromMessageObject', () => {
    it('dispatches DID documents to DIDMessage', () => {
        const message = MessageServer.fromMessageObject(didBody(), null);
        assert.instanceOf(message, DIDMessage);
        assert.equal(message.did, 'did:x');
    });

    it('dispatches policies to PolicyMessage', () => {
        const message = MessageServer.fromMessageObject(policyBody(), null);
        assert.instanceOf(message, PolicyMessage);
        assert.equal(message.uuid, 'uuid');
    });

    it('dispatches standard registries to RegistrationMessage', () => {
        const message = MessageServer.fromMessageObject(registrationBody(), null);
        assert.instanceOf(message, RegistrationMessage);
        assert.equal(message.did, 'did:sr');
    });

    it('accepts a matching expected type', () => {
        const message = MessageServer.fromMessageObject(topicBody(), null, MessageType.Topic);
        assert.instanceOf(message, TopicMessage);
    });

    it('accepts a matching type from an array of expected types', () => {
        const message = MessageServer.fromMessageObject(topicBody(), null, [MessageType.Policy, MessageType.Topic]);
        assert.instanceOf(message, TopicMessage);
    });

    it('keeps the message action from the payload', () => {
        const message = MessageServer.fromMessageObject(topicBody(), null);
        assert.equal(message.action, MessageAction.CreateTopic);
    });
});

describe('MessageServer.fromJson', () => {
    it('round-trips a topic message', () => {
        const original = new TopicMessage(MessageAction.CreateTopic);
        original.setDocument({
            name: 'n',
            description: 'd',
            owner: 'o',
            messageType: 'mt',
            childId: 'c',
            parentId: 'p',
            rationale: 'r'
        });
        const restored = MessageServer.fromJson(original.toJson());
        assert.instanceOf(restored, TopicMessage);
        assert.equal(restored.name, 'n');
        assert.equal(restored.owner, 'o');
    });

    it('round-trips a registration message', () => {
        const original = new RegistrationMessage(MessageAction.Init);
        original.setDocument('did:x', '0.0.5', { a: '1' });
        const restored = MessageServer.fromJson(original.toJson());
        assert.instanceOf(restored, RegistrationMessage);
        assert.equal(restored.did, 'did:x');
        assert.deepEqual(restored.attributes, { a: '1' });
    });

    it('preserves the message type through round-trip', () => {
        const original = new TopicMessage(MessageAction.CreateTopic);
        original.setDocument({ name: 'n', description: 'd', owner: 'o', messageType: 'mt', childId: 'c', parentId: 'p', rationale: 'r' });
        const restored = MessageServer.fromJson(original.toJson());
        assert.equal(restored.type, MessageType.Topic);
    });

    it('throws for an unknown message type', () => {
        assert.throws(() => MessageServer.fromJson({ type: 'bogus' }), 'Invalid format message');
    });

    it('throws for a missing type', () => {
        assert.throws(() => MessageServer.fromJson({}), 'Invalid format message');
    });
});
