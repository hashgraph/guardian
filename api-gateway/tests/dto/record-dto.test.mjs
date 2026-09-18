import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    RecordStatusDTO,
    RecordActionDTO,
    ResultDocumentDTO,
    ResultInfoDTO,
    RunningResultDTO,
    RunningDetailsDTO,
} from '../../dist/middlewares/validation/schemas/record.js';

describe('RecordStatusDTO', () => {
    it('accepts a valid status', () => {
        const errs = errorsFor(RecordStatusDTO, { type: 'Recording', policyId: 'p', uuid: 'u', status: 'New' });
        assert.equal(isClean(errs), true);
    });

    it('rejects a missing type', () => {
        const errs = errorsFor(RecordStatusDTO, { policyId: 'p', uuid: 'u', status: 'New' });
        assert.equal(hasConstraint(errs, 'type', 'isNotEmpty'), true);
    });

    it('rejects an empty status', () => {
        const errs = errorsFor(RecordStatusDTO, { type: 'Recording', policyId: 'p', uuid: 'u', status: '' });
        assert.equal(hasConstraint(errs, 'status', 'isNotEmpty'), true);
    });

    it('rejects a non-string policyId', () => {
        const errs = errorsFor(RecordStatusDTO, { type: 'Recording', policyId: 1, uuid: 'u', status: 'New' });
        assert.equal(hasConstraint(errs, 'policyId', 'isString'), true);
    });
});

describe('RecordActionDTO', () => {
    const valid = { uuid: 'u', policyId: 'p', method: 'POST', action: 'CreateDID', time: 't', user: 'd', target: 'tag' };

    it('accepts a valid action', () => {
        assert.equal(isClean(errorsFor(RecordActionDTO, valid)), true);
    });

    it('accepts an empty action string', () => {
        assert.equal(isClean(errorsFor(RecordActionDTO, { ...valid, action: '' })), true);
    });

    it('rejects a missing uuid', () => {
        const { uuid, ...rest } = valid;
        assert.equal(hasError(errorsFor(RecordActionDTO, rest), 'uuid'), true);
    });

    it('rejects an empty method', () => {
        assert.equal(hasConstraint(errorsFor(RecordActionDTO, { ...valid, method: '' }), 'method', 'isNotEmpty'), true);
    });

    it('rejects a non-string target', () => {
        assert.equal(hasConstraint(errorsFor(RecordActionDTO, { ...valid, target: 7 }), 'target', 'isString'), true);
    });
});

describe('ResultDocumentDTO', () => {
    const valid = { type: 'VC', schema: 's', rate: '100%', documents: {} };

    it('accepts a valid document result', () => {
        assert.equal(isClean(errorsFor(ResultDocumentDTO, valid)), true);
    });

    it('rejects a non-object documents', () => {
        assert.equal(hasConstraint(errorsFor(ResultDocumentDTO, { ...valid, documents: 'x' }), 'documents', 'isObject'), true);
    });

    it('rejects a missing rate', () => {
        const { rate, ...rest } = valid;
        assert.equal(hasError(errorsFor(ResultDocumentDTO, rest), 'rate'), true);
    });
});

describe('ResultInfoDTO', () => {
    it('accepts valid counters', () => {
        assert.equal(isClean(errorsFor(ResultInfoDTO, { tokens: 1, documents: 5 })), true);
    });

    it('rejects a non-number tokens', () => {
        assert.equal(hasConstraint(errorsFor(ResultInfoDTO, { tokens: 'x', documents: 5 }), 'tokens', 'isNumber'), true);
    });

    it('rejects a non-number documents', () => {
        assert.equal(hasConstraint(errorsFor(ResultInfoDTO, { tokens: 1, documents: null }), 'documents', 'isNumber'), true);
    });
});

describe('RunningResultDTO', () => {
    it('accepts a valid result', () => {
        const errs = errorsFor(RunningResultDTO, { info: { tokens: 1, documents: 1 }, total: 5, documents: [] });
        assert.equal(isClean(errs), true);
    });

    it('rejects a non-array documents', () => {
        const errs = errorsFor(RunningResultDTO, { info: {}, total: 5, documents: {} });
        assert.equal(hasConstraint(errs, 'documents', 'isArray'), true);
    });

    it('rejects a non-number total', () => {
        const errs = errorsFor(RunningResultDTO, { info: {}, total: '5', documents: [] });
        assert.equal(hasConstraint(errs, 'total', 'isNumber'), true);
    });
});

describe('RunningDetailsDTO', () => {
    const valid = { left: {}, right: {}, total: 10, documents: {} };

    it('accepts valid details', () => {
        assert.equal(isClean(errorsFor(RunningDetailsDTO, valid)), true);
    });

    it('rejects a non-object left', () => {
        assert.equal(hasConstraint(errorsFor(RunningDetailsDTO, { ...valid, left: 'x' }), 'left', 'isObject'), true);
    });

    it('rejects a non-object right', () => {
        assert.equal(hasConstraint(errorsFor(RunningDetailsDTO, { ...valid, right: 1 }), 'right', 'isObject'), true);
    });
});
