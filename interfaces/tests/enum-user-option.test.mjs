import assert from 'node:assert/strict';
import { UserOption } from '../dist/type/user-option.type.js';

describe('UserOption enum', () => {
    it('exposes the documented selection modes', () => {
        assert.equal(UserOption.ALL, 'ALL');
        assert.equal(UserOption.CURRENT, 'CURRENT');
        assert.equal(UserOption.ROLE, 'ROLE');
    });

    it('maps POLICY_OWNER to "OWNER" (legacy compatibility, NOT "POLICY_OWNER")', () => {
        assert.equal(UserOption.POLICY_OWNER, 'OWNER');
    });

    it('exposes document-scoped owner/issuer options', () => {
        assert.equal(UserOption.DOCUMENT_OWNER, 'DOCUMENT_OWNER');
        assert.equal(UserOption.DOCUMENT_ISSUER, 'DOCUMENT_ISSUER');
    });

    it('exposes GROUP_OWNER', () => {
        assert.equal(UserOption.GROUP_OWNER, 'GROUP_OWNER');
    });

    it('has exactly seven entries', () => {
        assert.equal(Object.keys(UserOption).length, 7);
    });
});
