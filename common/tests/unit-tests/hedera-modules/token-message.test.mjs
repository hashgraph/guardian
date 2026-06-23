import { assert } from 'chai';
import { TokenMessage } from '../../../dist/hedera-modules/message/token-message.js';
import { MessageType } from '../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../dist/hedera-modules/message/message-action.js';

const sampleBody = () => ({
    id: 'mid', status: 'ISSUE',
    type: MessageType.Token, action: MessageAction.CreateToken,
    lang: 'en', account: '0.0.5',
    tokenId: '0.0.1', tokenName: 'My Token', tokenSymbol: 'MTK',
    tokenType: 'fungible', decimals: '2', owner: 'did:owner'
});

describe('TokenMessage', () => {
    it('constructs with the Token type and given action', () => {
        const m = new TokenMessage(MessageAction.CreateToken);
        assert.equal(m.type, MessageType.Token);
        assert.equal(m.action, MessageAction.CreateToken);
    });

    it('setDocument copies token fields', () => {
        const m = new TokenMessage(MessageAction.CreateToken);
        m.setDocument({ tokenId: '0.0.1', tokenName: 'N', tokenSymbol: 'S', tokenType: 't', decimals: '2', owner: 'o' });
        assert.equal(m.tokenId, '0.0.1');
        assert.equal(m.tokenName, 'N');
        assert.equal(m.tokenSymbol, 'S');
        assert.equal(m.tokenType, 't');
        assert.equal(m.decimals, '2');
        assert.equal(m.owner, 'o');
    });

    it('toMessageObject serializes token fields with null id/status', () => {
        const m = new TokenMessage(MessageAction.CreateToken);
        m.setDocument({ tokenId: '0.0.1', tokenName: 'N' });
        const obj = m.toMessageObject();
        assert.equal(obj.id, null);
        assert.equal(obj.status, null);
        assert.equal(obj.type, MessageType.Token);
        assert.equal(obj.action, MessageAction.CreateToken);
        assert.equal(obj.tokenId, '0.0.1');
        assert.equal(obj.tokenName, 'N');
    });

    it('toDocuments resolves to an empty array', async () => {
        const m = new TokenMessage(MessageAction.CreateToken);
        assert.deepEqual(await m.toDocuments(), []);
    });

    it('loadDocuments returns the same instance', () => {
        const m = new TokenMessage(MessageAction.CreateToken);
        assert.equal(m.loadDocuments(['x']), m);
    });

    it('validate returns true', () => {
        assert.equal(new TokenMessage(MessageAction.CreateToken).validate(), true);
    });

    it('getUrls returns an empty array', () => {
        assert.deepEqual(new TokenMessage(MessageAction.CreateToken).getUrls(), []);
    });

    it('fromMessage throws on an empty message', () => {
        assert.throws(() => TokenMessage.fromMessage(''), /Message Object is empty/);
    });

    it('fromMessage parses a JSON string', () => {
        const m = TokenMessage.fromMessage(JSON.stringify(sampleBody()));
        assert.equal(m.tokenId, '0.0.1');
    });

    it('fromMessageObject throws on empty json', () => {
        assert.throws(() => TokenMessage.fromMessageObject(null), /JSON Object is empty/);
    });

    it('fromMessageObject throws on a non-Token type', () => {
        assert.throws(() => TokenMessage.fromMessageObject({ ...sampleBody(), type: 'Other' }), /Invalid message type/);
    });

    it('fromMessageObject maps token fields and id/status', () => {
        const m = TokenMessage.fromMessageObject(sampleBody());
        assert.equal(m.tokenId, '0.0.1');
        assert.equal(m.tokenName, 'My Token');
        assert.equal(m.tokenSymbol, 'MTK');
        assert.equal(m.tokenType, 'fungible');
        assert.equal(m.decimals, '2');
        assert.equal(m.owner, 'did:owner');
    });

    it('toJson includes token fields on top of the base payload', () => {
        const m = TokenMessage.fromMessageObject(sampleBody());
        const json = m.toJson();
        assert.equal(json.tokenId, '0.0.1');
        assert.equal(json.tokenSymbol, 'MTK');
        assert.equal(json.owner, 'did:owner');
    });

    it('fromJson reconstructs a TokenMessage from toJson output', () => {
        const original = TokenMessage.fromMessageObject(sampleBody());
        const restored = TokenMessage.fromJson(original.toJson());
        assert.equal(restored.tokenId, original.tokenId);
        assert.equal(restored.tokenName, original.tokenName);
        assert.equal(restored.owner, original.owner);
    });
});
