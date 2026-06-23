import assert from 'node:assert/strict';
import { MessageAction } from '../../../dist/hedera-modules/message/message-action.js';
import { MessageType } from '../../../dist/hedera-modules/message/message-type.js';

describe('@unit MessageAction enum', () => {
    it('contains the documented core actions', () => {
        const keys = Object.keys(MessageAction);
        for (const expected of ['CreateDID', 'CreateVC', 'PublishPolicy', 'CreateTopic', 'Mint', 'RevokeDocument']) {
            assert.ok(keys.includes(expected), `expected MessageAction.${expected}`);
        }
    });

    it('values are kebab-case strings (except Init)', () => {
        for (const [key, value] of Object.entries(MessageAction)) {
            if (key === 'Init') continue;
            assert.equal(typeof value, 'string');
            assert.match(value, /^[a-z][a-z0-9-]*$/, `${key} = "${value}" should be kebab-case`);
        }
    });

    it('every value is unique', () => {
        const values = Object.values(MessageAction);
        assert.equal(values.length, new Set(values).size,
            `Duplicate MessageAction values would collide on-chain. Values: ${values.join(',')}`);
    });

    it('PublishPolicy === "publish-policy" (immutable on-chain)', () => {
        assert.equal(MessageAction.PublishPolicy, 'publish-policy');
    });

    it('CreateDID === "create-did-document"', () => {
        assert.equal(MessageAction.CreateDID, 'create-did-document');
    });

    it('Mint === "mint"', () => {
        assert.equal(MessageAction.Mint, 'mint');
    });
});

describe('@unit MessageType enum', () => {
    it('contains the core types', () => {
        const keys = Object.keys(MessageType);
        for (const expected of ['VCDocument', 'VPDocument', 'DIDDocument', 'Policy', 'Schema', 'Token', 'StandardRegistry']) {
            assert.ok(keys.includes(expected));
        }
    });

    it('values are unique', () => {
        const values = Object.values(MessageType);
        assert.equal(values.length, new Set(values).size);
    });

    it('StandardRegistry === "Standard Registry" (legacy on-chain format)', () => {
        assert.equal(MessageType.StandardRegistry, 'Standard Registry');
    });

    it('Synchronization === "Synchronization Event"', () => {
        assert.equal(MessageType.Synchronization, 'Synchronization Event');
    });

    it('every value is a non-empty string', () => {
        for (const v of Object.values(MessageType)) {
            assert.equal(typeof v, 'string');
            assert.ok(v.length > 0);
        }
    });
});
