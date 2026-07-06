import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    IgnoreRuleDTO,
    PolicyVersionDTO,
    PolicyCategoryDTO,
    DeleteSavepointsDTO,
    DeleteSavepointsResultDTO,
    DebugBlockDataDTO,
} from '../../dist/middlewares/validation/schemas/policies.dto.js';

describe('IgnoreRuleDTO', () => {
    it('accepts an empty rule', () => {
        assert.equal(isClean(errorsFor(IgnoreRuleDTO, {})), true);
    });

    it('accepts severity warning', () => {
        assert.equal(isClean(errorsFor(IgnoreRuleDTO, { severity: 'warning' })), true);
    });

    it('accepts severity info', () => {
        assert.equal(isClean(errorsFor(IgnoreRuleDTO, { severity: 'info' })), true);
    });

    it('rejects an unknown severity', () => {
        assert.equal(hasConstraint(errorsFor(IgnoreRuleDTO, { severity: 'error' }), 'severity', 'isIn'), true);
    });

    it('rejects a non-string code', () => {
        assert.equal(hasConstraint(errorsFor(IgnoreRuleDTO, { code: 5 }), 'code', 'isString'), true);
    });

    it('rejects a non-string contains', () => {
        assert.equal(hasConstraint(errorsFor(IgnoreRuleDTO, { contains: {} }), 'contains', 'isString'), true);
    });
});

describe('PolicyVersionDTO', () => {
    it('accepts a valid version', () => {
        assert.equal(isClean(errorsFor(PolicyVersionDTO, { policyVersion: '1.0.0' })), true);
    });

    it('requires policyVersion', () => {
        assert.equal(hasConstraint(errorsFor(PolicyVersionDTO, {}), 'policyVersion', 'isString'), true);
    });

    it('rejects a non-boolean recordingEnabled', () => {
        const errs = errorsFor(PolicyVersionDTO, { policyVersion: '1.0.0', recordingEnabled: 'yes' });
        assert.equal(hasConstraint(errs, 'recordingEnabled', 'isBoolean'), true);
    });

    it('rejects a non-string policyAvailability', () => {
        const errs = errorsFor(PolicyVersionDTO, { policyVersion: '1.0.0', policyAvailability: 5 });
        assert.equal(hasConstraint(errs, 'policyAvailability', 'isString'), true);
    });
});

describe('PolicyCategoryDTO', () => {
    it('accepts a valid category', () => {
        assert.equal(isClean(errorsFor(PolicyCategoryDTO, { name: 'Large-Scale', type: 'PROJECT_SCALE' })), true);
    });

    it('requires name', () => {
        assert.equal(hasConstraint(errorsFor(PolicyCategoryDTO, { type: 't' }), 'name', 'isString'), true);
    });

    it('requires type', () => {
        assert.equal(hasConstraint(errorsFor(PolicyCategoryDTO, { name: 'n' }), 'type', 'isString'), true);
    });
});

describe('DeleteSavepointsDTO', () => {
    it('accepts a valid request', () => {
        assert.equal(isClean(errorsFor(DeleteSavepointsDTO, { savepointIds: ['a', 'b'] })), true);
    });

    it('accepts the guard bypass flag', () => {
        const errs = errorsFor(DeleteSavepointsDTO, { savepointIds: ['a'], skipCurrentSavepointGuard: true });
        assert.equal(isClean(errs), true);
    });

    it('rejects an empty savepointIds array', () => {
        assert.equal(hasConstraint(errorsFor(DeleteSavepointsDTO, { savepointIds: [] }), 'savepointIds', 'arrayNotEmpty'), true);
    });

    it('rejects non-string savepoint ids', () => {
        assert.equal(hasConstraint(errorsFor(DeleteSavepointsDTO, { savepointIds: [1] }), 'savepointIds', 'isString'), true);
    });

    it('requires savepointIds', () => {
        assert.equal(hasError(errorsFor(DeleteSavepointsDTO, {}), 'savepointIds'), true);
    });

    it('rejects a non-boolean skipCurrentSavepointGuard', () => {
        const errs = errorsFor(DeleteSavepointsDTO, { savepointIds: ['a'], skipCurrentSavepointGuard: 1 });
        assert.equal(hasConstraint(errs, 'skipCurrentSavepointGuard', 'isBoolean'), true);
    });
});

describe('DeleteSavepointsResultDTO', () => {
    it('accepts a valid result', () => {
        assert.equal(isClean(errorsFor(DeleteSavepointsResultDTO, { hardDeletedIds: ['a'] })), true);
    });

    it('accepts an empty result list', () => {
        assert.equal(isClean(errorsFor(DeleteSavepointsResultDTO, { hardDeletedIds: [] })), true);
    });

    it('rejects a non-array hardDeletedIds', () => {
        assert.equal(hasConstraint(errorsFor(DeleteSavepointsResultDTO, { hardDeletedIds: 'x' }), 'hardDeletedIds', 'isArray'), true);
    });
});

describe('DebugBlockDataDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(DebugBlockDataDTO, {})), true);
    });

    it('accepts a valid block data', () => {
        assert.equal(isClean(errorsFor(DebugBlockDataDTO, { input: 'RunEvent', output: 'RunEvent', type: 'json', document: { a: 1 } })), true);
    });

    it('rejects a non-string input', () => {
        assert.equal(hasConstraint(errorsFor(DebugBlockDataDTO, { input: 5 }), 'input', 'isString'), true);
    });

    it('rejects a non-string type', () => {
        assert.equal(hasConstraint(errorsFor(DebugBlockDataDTO, { type: [] }), 'type', 'isString'), true);
    });
});
