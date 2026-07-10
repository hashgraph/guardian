import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, isClean } from './_dto-helper.mjs';
import { WorkersTasksDTO } from '../../dist/middlewares/validation/schemas/worker-tasks.dto.js';
import { RoleDTO, AssignPolicyDTO } from '../../dist/middlewares/validation/schemas/permissions.dto.js';

const validWorker = {
    createDate: '2020-01-01',
    done: true,
    id: 'id',
    isRetryableTask: false,
    processedTime: '2020-01-01',
    sent: true,
    taskId: 'task',
    type: 'send-hedera',
    updateDate: '2020-01-01',
};

describe('WorkersTasksDTO', () => {
    it('accepts a fully valid task', () => {
        assert.equal(isClean(errorsFor(WorkersTasksDTO, validWorker)), true);
    });

    for (const field of ['createDate', 'id', 'processedTime', 'taskId', 'type', 'updateDate']) {
        it(`rejects a non-string ${field}`, () => {
            const errs = errorsFor(WorkersTasksDTO, { ...validWorker, [field]: 123 });
            assert.equal(hasConstraint(errs, field, 'isString'), true);
        });
    }

    for (const field of ['done', 'isRetryableTask', 'sent']) {
        it(`rejects a non-boolean ${field}`, () => {
            const errs = errorsFor(WorkersTasksDTO, { ...validWorker, [field]: 'yes' });
            assert.equal(hasConstraint(errs, field, 'isBoolean'), true);
        });
    }

    it('flags missing required string fields', () => {
        const errs = errorsFor(WorkersTasksDTO, { done: true, isRetryableTask: false, sent: true });
        assert.equal(hasConstraint(errs, 'createDate', 'isString'), true);
        assert.equal(hasConstraint(errs, 'taskId', 'isString'), true);
    });
});

describe('RoleDTO', () => {
    it('accepts optional boolean flags', () => {
        assert.equal(isClean(errorsFor(RoleDTO, { default: true, readonly: false })), true);
    });

    it('accepts an empty instance (optional flags omitted)', () => {
        assert.equal(isClean(errorsFor(RoleDTO, {})), true);
    });

    it('rejects a non-boolean default', () => {
        assert.equal(hasConstraint(errorsFor(RoleDTO, { default: 'x' }), 'default', 'isBoolean'), true);
    });

    it('rejects a non-boolean readonly', () => {
        assert.equal(hasConstraint(errorsFor(RoleDTO, { readonly: 1 }), 'readonly', 'isBoolean'), true);
    });
});

describe('AssignPolicyDTO', () => {
    it('accepts a valid assignment', () => {
        assert.equal(isClean(errorsFor(AssignPolicyDTO, { policyIds: ['a', 'b'], assign: true })), true);
    });

    it('accepts an empty policyIds array', () => {
        assert.equal(isClean(errorsFor(AssignPolicyDTO, { policyIds: [], assign: false })), true);
    });

    it('rejects a non-array policyIds', () => {
        assert.equal(hasConstraint(errorsFor(AssignPolicyDTO, { policyIds: 'x', assign: true }), 'policyIds', 'isArray'), true);
    });

    it('rejects a non-boolean assign', () => {
        assert.equal(hasConstraint(errorsFor(AssignPolicyDTO, { policyIds: [], assign: 'yes' }), 'assign', 'isBoolean'), true);
    });
});
