import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    DemoKeyResponseDTO,
    PolicyRoleDTO,
    RegisteredUserDTO,
} from '../../dist/middlewares/validation/schemas/demo.js';

describe('DemoKeyResponseDTO', () => {
    it('accepts a valid key response', () => {
        assert.equal(isClean(errorsFor(DemoKeyResponseDTO, { id: '0.0.1', key: '302e' })), true);
    });

    it('requires id', () => {
        assert.equal(hasConstraint(errorsFor(DemoKeyResponseDTO, { key: 'k' }), 'id', 'isString'), true);
    });

    it('rejects a non-string key', () => {
        assert.equal(hasConstraint(errorsFor(DemoKeyResponseDTO, { id: '0.0.1', key: 5 }), 'key', 'isString'), true);
    });
});

describe('PolicyRoleDTO', () => {
    it('accepts a valid policy role', () => {
        assert.equal(isClean(errorsFor(PolicyRoleDTO, { name: 'Policy', version: '1.0.0', role: 'VVB' })), true);
    });

    it('requires version', () => {
        assert.equal(hasConstraint(errorsFor(PolicyRoleDTO, { name: 'Policy', role: 'VVB' }), 'version', 'isString'), true);
    });

    it('rejects a non-string role', () => {
        assert.equal(hasConstraint(errorsFor(PolicyRoleDTO, { name: 'n', version: 'v', role: 1 }), 'role', 'isString'), true);
    });
});

describe('RegisteredUserDTO', () => {
    const valid = { did: 'did:hedera:1', username: 'user', role: 'STANDARD_REGISTRY', policyRoles: [] };

    it('accepts a valid registered user', () => {
        assert.equal(isClean(errorsFor(RegisteredUserDTO, valid)), true);
    });

    it('accepts an optional parent', () => {
        assert.equal(isClean(errorsFor(RegisteredUserDTO, { ...valid, parent: 'did:hedera:2' })), true);
    });

    it('rejects an empty username', () => {
        assert.equal(hasConstraint(errorsFor(RegisteredUserDTO, { ...valid, username: '' }), 'username', 'isNotEmpty'), true);
    });

    it('rejects a non-array policyRoles', () => {
        assert.equal(hasConstraint(errorsFor(RegisteredUserDTO, { ...valid, policyRoles: {} }), 'policyRoles', 'isArray'), true);
    });

    it('rejects a non-string parent', () => {
        assert.equal(hasConstraint(errorsFor(RegisteredUserDTO, { ...valid, parent: 7 }), 'parent', 'isString'), true);
    });

    it('requires did', () => {
        const { did, ...rest } = valid;
        assert.equal(hasError(errorsFor(RegisteredUserDTO, rest), 'did'), true);
    });

    it('requires role', () => {
        const { role, ...rest } = valid;
        assert.equal(hasError(errorsFor(RegisteredUserDTO, rest), 'role'), true);
    });
});
