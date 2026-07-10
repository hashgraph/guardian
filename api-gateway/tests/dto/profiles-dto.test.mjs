import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    UserDTO,
    ProfileDidDocumentRecordDTO,
    ProfileVcDocumentDTO,
    ProfileDTO,
    PolicyKeyDTO,
    PolicyKeyConfigDTO,
} from '../../dist/middlewares/validation/schemas/profiles.dto.js';

const validUser = { username: 'u', role: 'USER', permissionsGroup: [], permissions: ['x'] };

describe('UserDTO', () => {
    it('accepts a valid user', () => {
        assert.equal(isClean(errorsFor(UserDTO, validUser)), true);
    });

    it('accepts a user with optional did/parent/hederaAccountId', () => {
        assert.equal(isClean(errorsFor(UserDTO, { ...validUser, did: 'd', parent: 'p', hederaAccountId: '0.0.1' })), true);
    });

    it('rejects a non-string username', () => {
        assert.equal(hasConstraint(errorsFor(UserDTO, { ...validUser, username: 5 }), 'username', 'isString'), true);
    });

    it('rejects a non-string role', () => {
        assert.equal(hasConstraint(errorsFor(UserDTO, { ...validUser, role: 5 }), 'role', 'isString'), true);
    });

    it('rejects a non-array permissions', () => {
        assert.equal(hasConstraint(errorsFor(UserDTO, { ...validUser, permissions: 'x' }), 'permissions', 'isArray'), true);
    });

    it('rejects a non-array permissionsGroup', () => {
        assert.equal(hasConstraint(errorsFor(UserDTO, { ...validUser, permissionsGroup: 'x' }), 'permissionsGroup', 'isArray'), true);
    });

    it('rejects a non-string did', () => {
        assert.equal(hasConstraint(errorsFor(UserDTO, { ...validUser, did: 5 }), 'did', 'isString'), true);
    });

    it('rejects a non-string hederaAccountId', () => {
        assert.equal(hasConstraint(errorsFor(UserDTO, { ...validUser, hederaAccountId: 5 }), 'hederaAccountId', 'isString'), true);
    });
});

describe('ProfileDidDocumentRecordDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(ProfileDidDocumentRecordDTO, {})), true);
    });

    for (const field of ['createDate', 'updateDate', 'did', 'status', 'messageId', 'topicId', 'id']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(ProfileDidDocumentRecordDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }
});

describe('ProfileVcDocumentDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(ProfileVcDocumentDTO, {})), true);
    });

    it('accepts valid documentFileId and tableFileIds', () => {
        assert.equal(isClean(errorsFor(ProfileVcDocumentDTO, { documentFileId: 'x', tableFileIds: ['a', 'b'] })), true);
    });

    it('rejects a non-string documentFileId', () => {
        assert.equal(hasConstraint(errorsFor(ProfileVcDocumentDTO, { documentFileId: 5 }), 'documentFileId', 'isString'), true);
    });

    it('rejects a non-array tableFileIds', () => {
        assert.equal(hasConstraint(errorsFor(ProfileVcDocumentDTO, { tableFileIds: 'x' }), 'tableFileIds', 'isArray'), true);
    });

    it('rejects non-string elements in tableFileIds', () => {
        assert.equal(hasConstraint(errorsFor(ProfileVcDocumentDTO, { tableFileIds: [1, 2] }), 'tableFileIds', 'isString'), true);
    });
});

describe('ProfileDTO', () => {
    it('accepts an empty payload (inherited fields are not required because validateSync skips undefined)', () => {
        assert.equal(isClean(errorsFor(ProfileDTO, validUser)), true);
    });

    it('accepts valid boolean and enum fields', () => {
        assert.equal(isClean(errorsFor(ProfileDTO, { ...validUser, confirmed: true, failed: false, location: 'local' })), true);
    });

    it('rejects a non-boolean confirmed', () => {
        assert.equal(hasConstraint(errorsFor(ProfileDTO, { ...validUser, confirmed: 'x' }), 'confirmed', 'isBoolean'), true);
    });

    it('rejects a non-boolean failed', () => {
        assert.equal(hasConstraint(errorsFor(ProfileDTO, { ...validUser, failed: 'x' }), 'failed', 'isBoolean'), true);
    });

    it('rejects an out-of-enum location', () => {
        assert.equal(hasConstraint(errorsFor(ProfileDTO, { ...validUser, location: 'mars' }), 'location', 'isEnum'), true);
    });

    it('rejects a non-string topicId', () => {
        assert.equal(hasConstraint(errorsFor(ProfileDTO, { ...validUser, topicId: 5 }), 'topicId', 'isString'), true);
    });
});

describe('PolicyKeyDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyKeyDTO, {})), true);
    });

    for (const field of ['id', 'createDate', 'updateDate', 'messageId', 'owner', 'policyName', 'key']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(PolicyKeyDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }
});

describe('PolicyKeyConfigDTO', () => {
    it('accepts a valid config', () => {
        assert.equal(isClean(errorsFor(PolicyKeyConfigDTO, { messageId: 'm' })), true);
    });

    it('rejects a missing messageId', () => {
        assert.equal(hasError(errorsFor(PolicyKeyConfigDTO, {}), 'messageId'), true);
    });

    it('rejects a non-string messageId', () => {
        assert.equal(hasConstraint(errorsFor(PolicyKeyConfigDTO, { messageId: 5 }), 'messageId', 'isString'), true);
    });

    it('rejects a non-string key', () => {
        assert.equal(hasConstraint(errorsFor(PolicyKeyConfigDTO, { messageId: 'm', key: 5 }), 'key', 'isString'), true);
    });
});
