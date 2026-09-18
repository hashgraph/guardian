import { assert } from 'chai';
import { MessageType } from '../../../dist/hedera-modules/message/message-type.js';
import { MessageAction } from '../../../dist/hedera-modules/message/message-action.js';

describe('MessageType enum', () => {
    it('exposes the expected document/topic categories', () => {
        assert.equal(MessageType.VCDocument, 'VC-Document');
        assert.equal(MessageType.EVCDocument, 'EVC-Document');
        assert.equal(MessageType.VPDocument, 'VP-Document');
        assert.equal(MessageType.DIDDocument, 'DID-Document');
        assert.equal(MessageType.Policy, 'Policy');
        assert.equal(MessageType.InstancePolicy, 'Instance-Policy');
        assert.equal(MessageType.Schema, 'Schema');
        assert.equal(MessageType.Topic, 'Topic');
        assert.equal(MessageType.StandardRegistry, 'Standard Registry');
        assert.equal(MessageType.Token, 'Token');
    });

    it('all values are unique strings', () => {
        const values = Object.values(MessageType);
        assert.equal(new Set(values).size, values.length);
        for (const v of values) {
            assert.equal(typeof v, 'string');
            assert.isAbove(v.length, 0);
        }
    });
});

describe('MessageAction enum', () => {
    it('exposes the expected lifecycle actions', () => {
        assert.equal(MessageAction.CreateDID, 'create-did-document');
        assert.equal(MessageAction.CreateVC, 'create-vc-document');
        assert.equal(MessageAction.CreatePolicy, 'create-policy');
        assert.equal(MessageAction.PublishPolicy, 'publish-policy');
        assert.equal(MessageAction.DeletePolicy, 'delete-policy');
        assert.equal(MessageAction.CreateSchema, 'create-schema');
        assert.equal(MessageAction.PublishSchema, 'publish-schema');
        assert.equal(MessageAction.CreateTopic, 'create-topic');
        assert.equal(MessageAction.RevokeDocument, 'revoke-document');
        assert.equal(MessageAction.DeleteDocument, 'delete-document');
        assert.equal(MessageAction.Init, 'Init');
    });

    it('all values are unique strings (no overlapping wire identifiers)', () => {
        const values = Object.values(MessageAction);
        assert.equal(new Set(values).size, values.length);
        for (const v of values) {
            assert.equal(typeof v, 'string');
            assert.isAbove(v.length, 0);
        }
    });

    it('most actions are kebab-case (verb-noun); a small set are PascalCase exceptions', () => {
        const kebab = /^[a-z]+(-[a-z]+)*$/;
        const exceptions = ['Init'];
        for (const [key, value] of Object.entries(MessageAction)) {
            if (exceptions.includes(value)) continue;
            assert.match(value, kebab, `action ${key}=${value} is not kebab-case`);
        }
    });
});
