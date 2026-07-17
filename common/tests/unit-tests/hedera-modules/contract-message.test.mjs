import { assert } from 'chai';
import { ContractMessage } from '../../../dist/hedera-modules/message/contract-message.js';
import { MessageType } from '../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../dist/hedera-modules/message/message-action.js';

const body = (over = {}) => ({
    id: 'cid', status: 'ISSUE',
    type: MessageType.Contract, action: MessageAction.CreateContract,
    lang: 'en', account: '0.0.9',
    contractId: '0.0.100', description: 'desc', contractType: 'WIPE',
    owner: 'did:owner', version: '2.1.0', ...over
});

describe('ContractMessage', () => {
    it('constructs with the Contract type', () => {
        const m = new ContractMessage(MessageAction.CreateContract);
        assert.equal(m.type, MessageType.Contract);
        assert.equal(m.action, MessageAction.CreateContract);
    });

    it('setDocument copies contract fields (type → contractType)', () => {
        const m = new ContractMessage(MessageAction.CreateContract);
        m.setDocument({ contractId: '0.0.100', description: 'd', type: 'RETIRE', owner: 'o', version: '1.2.3' });
        assert.equal(m.contractId, '0.0.100');
        assert.equal(m.description, 'd');
        assert.equal(m.contractType, 'RETIRE');
        assert.equal(m.owner, 'o');
        assert.equal(m.version, '1.2.3');
    });

    it('toMessageObject serializes with null id/status', () => {
        const m = new ContractMessage(MessageAction.CreateContract);
        m.setDocument({ contractId: '0.0.100', type: 'WIPE' });
        const obj = m.toMessageObject();
        assert.equal(obj.id, null);
        assert.equal(obj.status, null);
        assert.equal(obj.contractId, '0.0.100');
        assert.equal(obj.contractType, 'WIPE');
    });

    it('toDocuments resolves to []', async () => {
        assert.deepEqual(await new ContractMessage(MessageAction.CreateContract).toDocuments(), []);
    });

    it('loadDocuments returns the instance', () => {
        const m = new ContractMessage(MessageAction.CreateContract);
        assert.equal(m.loadDocuments([]), m);
    });

    it('validate is true and getUrls is empty', () => {
        const m = new ContractMessage(MessageAction.CreateContract);
        assert.equal(m.validate(), true);
        assert.deepEqual(m.getUrls(), []);
    });

    it('fromMessage throws on an empty message', () => {
        assert.throws(() => ContractMessage.fromMessage(''), /Message Object is empty/);
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => ContractMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject throws on a non-Contract type', () => {
        assert.throws(() => ContractMessage.fromMessageObject(body({ type: 'Other' })), /Invalid message type/);
    });

    it('fromMessageObject maps contract fields', () => {
        const m = ContractMessage.fromMessageObject(body());
        assert.equal(m.contractId, '0.0.100');
        assert.equal(m.contractType, 'WIPE');
        assert.equal(m.owner, 'did:owner');
        assert.equal(m.version, '2.1.0');
    });

    it('fromMessageObject defaults version to 1.0.0 when missing', () => {
        const m = ContractMessage.fromMessageObject(body({ version: undefined }));
        assert.equal(m.version, '1.0.0');
    });

    it('getOwner returns the contract owner', () => {
        const m = ContractMessage.fromMessageObject(body());
        assert.equal(m.getOwner(), 'did:owner');
    });

    it('toJson / fromJson round-trips contract fields', () => {
        const original = ContractMessage.fromMessageObject(body());
        const restored = ContractMessage.fromJson(original.toJson());
        assert.equal(restored.contractId, '0.0.100');
        assert.equal(restored.contractType, 'WIPE');
        assert.equal(restored.version, '2.1.0');
    });
});
