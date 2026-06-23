import assert from 'node:assert/strict';
import { MessageType } from '../../dist/hedera-modules/message/message-type.js';

describe('common MessageType enum', () => {
    it('exposes representative document and resource types', () => {
        assert.equal(MessageType.VCDocument, 'VC-Document');
        assert.equal(MessageType.VPDocument, 'VP-Document');
        assert.equal(MessageType.DIDDocument, 'DID-Document');
        assert.equal(MessageType.Policy, 'Policy');
        assert.equal(MessageType.Schema, 'Schema');
        assert.equal(MessageType.StandardRegistry, 'Standard Registry');
        assert.equal(MessageType.RoleDocument, 'Role-Document');
        assert.equal(MessageType.PolicyComment, 'Policy-Comment');
    });
    it('has 25+ message types', () => {
        assert.ok(Object.keys(MessageType).length >= 25);
    });
});
