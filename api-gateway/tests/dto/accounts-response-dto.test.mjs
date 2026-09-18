import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    PermissionGroupResponseDTO,
    AccountsResponseDTO,
    AccountsLoginResponseDTO,
    AccountsSessionResponseDTO,
    LoginSuccessResponseDTO,
    LoginOTPRequiredResponseDTO,
} from '../../dist/middlewares/validation/schemas/accounts.js';

describe('PermissionGroupResponseDTO', () => {
    it('accepts a valid group', () => {
        assert.equal(isClean(errorsFor(PermissionGroupResponseDTO, { uuid: 'u', roleId: 'r', roleName: 'Role', owner: 'did' })), true);
    });

    it('accepts a null owner', () => {
        assert.equal(isClean(errorsFor(PermissionGroupResponseDTO, { uuid: 'u', roleId: 'r', roleName: 'Role', owner: null })), true);
    });

    it('requires roleId', () => {
        assert.equal(hasConstraint(errorsFor(PermissionGroupResponseDTO, { uuid: 'u', roleName: 'Role' }), 'roleId', 'isString'), true);
    });

    it('rejects a non-string uuid', () => {
        assert.equal(hasConstraint(errorsFor(PermissionGroupResponseDTO, { uuid: 5, roleId: 'r', roleName: 'Role' }), 'uuid', 'isString'), true);
    });
});

describe('AccountsResponseDTO', () => {
    const valid = { id: '1', username: 'user', role: 'USER' };

    it('accepts a minimal account', () => {
        assert.equal(isClean(errorsFor(AccountsResponseDTO, valid)), true);
    });

    it('accepts optional permissions and location', () => {
        assert.equal(isClean(errorsFor(AccountsResponseDTO, { ...valid, permissions: ['a'], permissionsGroup: [], location: 'local' })), true);
    });

    it('rejects non-string permission entries', () => {
        assert.equal(hasConstraint(errorsFor(AccountsResponseDTO, { ...valid, permissions: [1] }), 'permissions', 'isString'), true);
    });

    it('rejects a non-array permissions', () => {
        assert.equal(hasConstraint(errorsFor(AccountsResponseDTO, { ...valid, permissions: 'x' }), 'permissions', 'isArray'), true);
    });

    it('rejects a non-string location', () => {
        assert.equal(hasConstraint(errorsFor(AccountsResponseDTO, { ...valid, location: 7 }), 'location', 'isString'), true);
    });
});

describe('AccountsLoginResponseDTO', () => {
    const valid = { username: 'user', did: 'did', role: 'USER', refreshToken: 'token' };

    it('accepts a valid login response', () => {
        assert.equal(isClean(errorsFor(AccountsLoginResponseDTO, valid)), true);
    });

    it('accepts an optional weakPassword flag', () => {
        assert.equal(isClean(errorsFor(AccountsLoginResponseDTO, { ...valid, weakPassword: false })), true);
    });

    it('rejects a non-boolean weakPassword', () => {
        assert.equal(hasConstraint(errorsFor(AccountsLoginResponseDTO, { ...valid, weakPassword: 'no' }), 'weakPassword', 'isBoolean'), true);
    });

    it('requires refreshToken', () => {
        const { refreshToken, ...rest } = valid;
        assert.equal(hasError(errorsFor(AccountsLoginResponseDTO, rest), 'refreshToken'), true);
    });
});

describe('AccountsSessionResponseDTO', () => {
    it('accepts a minimal session', () => {
        assert.equal(isClean(errorsFor(AccountsSessionResponseDTO, { id: '1', username: 'user', role: 'USER' })), true);
    });

    it('accepts optional did and hederaAccountId', () => {
        const errs = errorsFor(AccountsSessionResponseDTO, { id: '1', username: 'user', role: 'USER', did: 'd', hederaAccountId: '0.0.1' });
        assert.equal(isClean(errs), true);
    });

    it('rejects a non-string hederaAccountId', () => {
        const errs = errorsFor(AccountsSessionResponseDTO, { id: '1', username: 'user', role: 'USER', hederaAccountId: 5 });
        assert.equal(hasConstraint(errs, 'hederaAccountId', 'isString'), true);
    });

    it('requires username', () => {
        assert.equal(hasError(errorsFor(AccountsSessionResponseDTO, { id: '1', role: 'USER' }), 'username'), true);
    });
});

describe('LoginSuccessResponseDTO', () => {
    const valid = { did: 'd', refreshToken: 't', role: 'USER', username: 'user', weakPassword: 'false' };

    it('accepts a valid response', () => {
        assert.equal(isClean(errorsFor(LoginSuccessResponseDTO, valid)), true);
    });

    it('rejects a boolean weakPassword', () => {
        assert.equal(hasConstraint(errorsFor(LoginSuccessResponseDTO, { ...valid, weakPassword: false }), 'weakPassword', 'isString'), true);
    });

    it('requires did', () => {
        const { did, ...rest } = valid;
        assert.equal(hasError(errorsFor(LoginSuccessResponseDTO, rest), 'did'), true);
    });
});

describe('LoginOTPRequiredResponseDTO', () => {
    it('accepts a valid response', () => {
        assert.equal(isClean(errorsFor(LoginOTPRequiredResponseDTO, { success: false, otprequired: true })), true);
    });

    it('rejects a non-boolean success', () => {
        assert.equal(hasConstraint(errorsFor(LoginOTPRequiredResponseDTO, { success: 'no', otprequired: true }), 'success', 'isBoolean'), true);
    });

    it('rejects a non-boolean otprequired', () => {
        assert.equal(hasConstraint(errorsFor(LoginOTPRequiredResponseDTO, { success: true, otprequired: 1 }), 'otprequired', 'isBoolean'), true);
    });
});
