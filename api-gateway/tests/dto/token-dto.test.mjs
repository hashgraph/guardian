import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, hasError, isClean } from './_dto-helper.mjs';
import {
    TransferTokenDTO,
} from '../../dist/middlewares/validation/schemas/token.dto.js';

describe('TransferTokenDTO', () => {
    it('accepts a valid fungible transfer', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', amount: 10 });
        assert.equal(isClean(errs), true);
    });

    it('accepts a valid NFT transfer with serial numbers', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', serialNumbers: [1, 2, 3] });
        assert.equal(isClean(errs), true);
    });

    it('accepts a transfer with an optional memo', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', amount: 5, memo: 'note' });
        assert.equal(isClean(errs), true);
    });

    it('rejects a missing targetAccount', () => {
        const errs = errorsFor(TransferTokenDTO, { amount: 10 });
        assert.equal(hasError(errs, 'targetAccount'), true);
    });

    it('flags targetAccount as not a string', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: 123, amount: 10 });
        assert.equal(hasConstraint(errs, 'targetAccount', 'isString'), true);
    });

    it('flags targetAccount as empty', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '', amount: 10 });
        assert.equal(hasConstraint(errs, 'targetAccount', 'isNotEmpty'), true);
    });

    it('requires amount when no serial numbers are given', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1' });
        assert.equal(hasError(errs, 'amount'), true);
    });

    it('rejects a non-positive amount', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', amount: 0 });
        assert.equal(hasConstraint(errs, 'amount', 'isPositive'), true);
    });

    it('rejects a non-number amount', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', amount: 'x' });
        assert.equal(hasConstraint(errs, 'amount', 'isNumber'), true);
    });

    it('rejects a non-array serialNumbers', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', serialNumbers: 5 });
        assert.equal(hasConstraint(errs, 'serialNumbers', 'isArray'), true);
    });

    it('rejects an empty serialNumbers array', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', serialNumbers: [] });
        assert.equal(hasConstraint(errs, 'serialNumbers', 'arrayMinSize'), true);
    });

    it('rejects non-integer serial numbers', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', serialNumbers: [1.5] });
        assert.equal(hasConstraint(errs, 'serialNumbers', 'isInt'), true);
    });

    it('rejects serial numbers below the minimum', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', serialNumbers: [0] });
        assert.equal(hasConstraint(errs, 'serialNumbers', 'min'), true);
    });

    it('rejects a non-string memo', () => {
        const errs = errorsFor(TransferTokenDTO, { targetAccount: '0.0.1', amount: 1, memo: 5 });
        assert.equal(hasConstraint(errs, 'memo', 'isString'), true);
    });
});
