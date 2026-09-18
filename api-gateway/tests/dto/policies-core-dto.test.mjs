import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean, make } from './_dto-helper.mjs';
import {
    PolicyTestDTO,
    PolicyToolDTO,
    PolicyImportantParametersDTO,
    PolicyDTO,
    PolicyPreviewDTO,
    PoliciesValidationDTO,
} from '../../dist/middlewares/validation/schemas/policies.dto.js';

describe('PolicyTestDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(PolicyTestDTO, {})), true);
    });

    it('accepts a fully populated test', () => {
        const errs = errorsFor(PolicyTestDTO, {
            id: '1',
            uuid: 'u',
            name: 'n',
            policyId: 'p',
            owner: 'o',
            status: 'New',
            date: '2024-01-01',
            duration: 10,
            progress: 50,
            resultId: 'r',
            result: {},
        });
        assert.equal(isClean(errs), true);
    });

    it('rejects a non-string name', () => {
        assert.equal(hasConstraint(errorsFor(PolicyTestDTO, { name: 5 }), 'name', 'isString'), true);
    });

    it('rejects a non-number duration', () => {
        assert.equal(hasConstraint(errorsFor(PolicyTestDTO, { duration: 'x' }), 'duration', 'isNumber'), true);
    });

    it('rejects a non-object result', () => {
        assert.equal(hasConstraint(errorsFor(PolicyTestDTO, { result: 'x' }), 'result', 'isObject'), true);
    });
});

describe('PolicyToolDTO', () => {
    it('accepts a valid tool reference', () => {
        const errs = errorsFor(PolicyToolDTO, { name: 'Tool', version: '1.0.0', topicId: '0.0.1', messageId: 'm' });
        assert.equal(isClean(errs), true);
    });

    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(PolicyToolDTO, {})), true);
    });

    it('rejects a non-string version', () => {
        assert.equal(hasConstraint(errorsFor(PolicyToolDTO, { version: 1 }), 'version', 'isString'), true);
    });

    it('rejects a non-string topicId', () => {
        assert.equal(hasConstraint(errorsFor(PolicyToolDTO, { topicId: 1 }), 'topicId', 'isString'), true);
    });
});

describe('PolicyDTO', () => {
    it('accepts an empty policy', () => {
        assert.equal(isClean(errorsFor(PolicyDTO, {})), true);
    });

    it('accepts valid nested importantParameters', () => {
        const nested = make(PolicyImportantParametersDTO, { atValidation: 'a', monitored: 'b' });
        assert.equal(isClean(errorsFor(PolicyDTO, { importantParameters: nested })), true);
    });

    it('rejects invalid nested importantParameters values', () => {
        const nested = make(PolicyImportantParametersDTO, { atValidation: 5 });
        const errs = errorsFor(PolicyDTO, { importantParameters: nested });
        assert.equal(hasConstraint(errs, 'importantParameters.atValidation', 'isString'), true);
    });

    it('rejects a non-array tools value', () => {
        assert.equal(hasConstraint(errorsFor(PolicyDTO, { tools: 'x' }), 'tools', 'isArray'), true);
    });

    it('rejects a non-boolean originalChanged', () => {
        assert.equal(hasConstraint(errorsFor(PolicyDTO, { originalChanged: 'yes' }), 'originalChanged', 'isBoolean'), true);
    });

    it('rejects a non-object config', () => {
        assert.equal(hasConstraint(errorsFor(PolicyDTO, { config: 'x' }), 'config', 'isObject'), true);
    });

    it('rejects a non-array userRoles', () => {
        assert.equal(hasConstraint(errorsFor(PolicyDTO, { userRoles: 'Installer' }), 'userRoles', 'isArray'), true);
    });

    it('rejects a non-string status', () => {
        assert.equal(hasConstraint(errorsFor(PolicyDTO, { status: 7 }), 'status', 'isString'), true);
    });
});

describe('PolicyPreviewDTO', () => {
    it('accepts a valid preview', () => {
        const errs = errorsFor(PolicyPreviewDTO, { module: {}, messageId: '0.0.1' });
        assert.equal(isClean(errs), true);
    });

    it('requires messageId', () => {
        assert.equal(hasConstraint(errorsFor(PolicyPreviewDTO, { module: {} }), 'messageId', 'isString'), true);
    });

    it('rejects a non-object module', () => {
        assert.equal(hasConstraint(errorsFor(PolicyPreviewDTO, { module: 'x', messageId: 'm' }), 'module', 'isObject'), true);
    });

    it('rejects a non-array schemas', () => {
        const errs = errorsFor(PolicyPreviewDTO, { module: {}, messageId: 'm', schemas: 'x' });
        assert.equal(hasConstraint(errs, 'schemas', 'isArray'), true);
    });
});

describe('PoliciesValidationDTO', () => {
    it('accepts a valid validation result', () => {
        const errs = errorsFor(PoliciesValidationDTO, { policies: [], isValid: true, errors: {} });
        assert.equal(isClean(errs), true);
    });

    it('rejects a non-array policies', () => {
        const errs = errorsFor(PoliciesValidationDTO, { policies: {}, isValid: true, errors: {} });
        assert.equal(hasConstraint(errs, 'policies', 'isArray'), true);
    });

    it('rejects a non-boolean isValid', () => {
        const errs = errorsFor(PoliciesValidationDTO, { policies: [], isValid: 'true', errors: {} });
        assert.equal(hasConstraint(errs, 'isValid', 'isBoolean'), true);
    });

    it('requires errors object', () => {
        const errs = errorsFor(PoliciesValidationDTO, { policies: [], isValid: false });
        assert.equal(hasError(errs, 'errors'), true);
    });
});
