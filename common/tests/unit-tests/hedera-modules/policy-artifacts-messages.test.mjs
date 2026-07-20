import { assert } from 'chai';
import {
    LabelMessage,
    StatisticMessage,
    SchemaPackageMessage,
    PolicyDiffMessage,
    PolicyRecordMessage,
    MessageType,
    MessageAction
} from '../../../dist/hedera-modules/message/index.js';

describe('LabelMessage', () => {
    const body = (over = {}) => ({
        id: 'id', status: 'ISSUE', type: MessageType.PolicyLabel, action: MessageAction.CreateVC,
        name: 'label', description: 'd', owner: 'did:o', uuid: 'u1',
        policyTopicId: '0.0.1', policyInstanceTopicId: '0.0.2', ...over
    });
    it('constructs with the PolicyLabel type', () => {
        assert.equal(new LabelMessage(MessageAction.CreateVC).type, MessageType.PolicyLabel);
    });
    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => LabelMessage.fromMessageObject(null), /JSON Object is empty/);
    });
    it('fromMessageObject maps label fields', () => {
        const m = LabelMessage.fromMessageObject(body());
        assert.equal(m.name, 'label');
        assert.equal(m.uuid, 'u1');
        assert.equal(m.policyTopicId, '0.0.1');
        assert.equal(m.policyInstanceTopicId, '0.0.2');
    });
});

describe('StatisticMessage', () => {
    const body = (over = {}) => ({
        id: 'id', status: 'ISSUE', type: MessageType.PolicyStatistic, action: MessageAction.CreateVC,
        name: 'stat', description: 'd', owner: 'did:o', uuid: 'u1',
        policyTopicId: '0.0.1', policyInstanceTopicId: '0.0.2', ...over
    });
    it('constructs with the PolicyStatistic type', () => {
        assert.equal(new StatisticMessage(MessageAction.CreateVC).type, MessageType.PolicyStatistic);
    });
    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => StatisticMessage.fromMessageObject(null), /JSON Object is empty/);
    });
    it('fromMessageObject maps statistic fields', () => {
        const m = StatisticMessage.fromMessageObject(body());
        assert.equal(m.name, 'stat');
        assert.equal(m.owner, 'did:o');
        assert.equal(m.policyTopicId, '0.0.1');
    });
});

describe('SchemaPackageMessage', () => {
    const body = (over = {}) => ({
        id: 'id', status: 'ISSUE', type: MessageType.SchemaPackage, action: MessageAction.CreateVC,
        name: 'pkg', owner: 'did:o', version: '1.0.0', schemas: ['s1', 's2'], ...over
    });
    it('constructs with the SchemaPackage type', () => {
        assert.equal(new SchemaPackageMessage(MessageAction.CreateVC).type, MessageType.SchemaPackage);
    });
    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => SchemaPackageMessage.fromMessageObject(null), /JSON Object is empty/);
    });
    it('fromMessageObject maps package fields', () => {
        const m = SchemaPackageMessage.fromMessageObject(body());
        assert.equal(m.name, 'pkg');
        assert.equal(m.version, '1.0.0');
        assert.deepEqual(m.schemas, ['s1', 's2']);
    });
});

describe('PolicyDiffMessage', () => {
    const body = (over = {}) => ({
        id: 'id', status: 'ISSUE', type: MessageType.PolicyDiff, action: MessageAction.CreateVC,
        uuid: 'u1', owner: 'did:o', diffType: 'full', diffIndex: 3,
        policyTopicId: '0.0.1', instanceTopicId: '0.0.2', ...over
    });
    it('constructs with the PolicyDiff type', () => {
        assert.equal(new PolicyDiffMessage(MessageType.PolicyDiff, MessageAction.CreateVC).type, MessageType.PolicyDiff);
    });
    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => PolicyDiffMessage.fromMessageObject(null), /JSON Object is empty/);
    });
    it('fromMessageObject throws on a wrong type', () => {
        assert.throws(() => PolicyDiffMessage.fromMessageObject(body({ type: 'Other' })), /Invalid message type/);
    });
    it('fromMessageObject maps diff fields', () => {
        const m = PolicyDiffMessage.fromMessageObject(body());
        assert.equal(m.uuid, 'u1');
        assert.equal(m.diffType, 'full');
        assert.equal(m.diffIndex, 3);
        assert.equal(m.policyTopicId, '0.0.1');
        assert.equal(m.instanceTopicId, '0.0.2');
    });
});

describe('PolicyRecordMessage', () => {
    const body = (over = {}) => ({
        id: 'id', status: 'ISSUE', type: MessageType.PolicyRecordStep, action: MessageAction.PolicyRecordStep,
        policyId: 'p1', policyMessageId: 'pm1', recordingUuid: 'r1', recordId: 'rec1',
        recordActionId: 'ra1', method: 'POST', actionName: 'act', time: '123', user: 'u', target: 't', ...over
    });
    it('constructs with the PolicyRecordStep type', () => {
        assert.equal(new PolicyRecordMessage().type, MessageType.PolicyRecordStep);
    });
    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => PolicyRecordMessage.fromMessageObject(null), /JSON Object is empty/);
    });
    it('fromMessageObject throws on a wrong type', () => {
        assert.throws(() => PolicyRecordMessage.fromMessageObject(body({ type: 'Other' })), /Invalid message type/);
    });
    it('fromMessageObject maps record fields', () => {
        const m = PolicyRecordMessage.fromMessageObject(body());
        assert.equal(m.policyId, 'p1');
        assert.equal(m.recordingUuid, 'r1');
        assert.equal(m.recordId, 'rec1');
        assert.equal(m.method, 'POST');
        assert.equal(m.actionName, 'act');
    });
    it('fromMessageObject defaults optional fields to null when absent', () => {
        const m = PolicyRecordMessage.fromMessageObject(body({ user: undefined, target: undefined, actionName: undefined }));
        assert.equal(m.user, null);
        assert.equal(m.target, null);
        assert.equal(m.actionName, null);
    });
});
