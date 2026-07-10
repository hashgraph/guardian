import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, isClean } from './_dto-helper.mjs';
import {
    RelayerAccountDTO,
    NewRelayerAccountDTO,
} from '../../dist/middlewares/validation/schemas/relayer-account.dto.js';
import { PolicyParametersDTO } from '../../dist/middlewares/validation/schemas/policy-parameters.dto.js';

describe('RelayerAccountDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(RelayerAccountDTO, {})), true);
    });

    it('accepts a fully populated account', () => {
        const errs = errorsFor(RelayerAccountDTO, {
            id: '1',
            name: 'Account',
            username: 'user',
            owner: 'did:hedera:1',
            parent: 'did:hedera:2',
            account: '0.0.1',
            createDate: '2024-01-01',
            updateDate: '2024-01-02',
        });
        assert.equal(isClean(errs), true);
    });

    it('rejects a non-string name', () => {
        assert.equal(hasConstraint(errorsFor(RelayerAccountDTO, { name: 1 }), 'name', 'isString'), true);
    });

    it('rejects a non-string account', () => {
        assert.equal(hasConstraint(errorsFor(RelayerAccountDTO, { account: {} }), 'account', 'isString'), true);
    });

    it('rejects a non-string parent', () => {
        assert.equal(hasConstraint(errorsFor(RelayerAccountDTO, { parent: 5 }), 'parent', 'isString'), true);
    });
});

describe('NewRelayerAccountDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(NewRelayerAccountDTO, {})), true);
    });

    it('accepts a valid new account', () => {
        assert.equal(isClean(errorsFor(NewRelayerAccountDTO, { name: 'n', account: '0.0.1', key: 'k' })), true);
    });

    it('rejects a non-string key', () => {
        assert.equal(hasConstraint(errorsFor(NewRelayerAccountDTO, { key: 5 }), 'key', 'isString'), true);
    });

    it('rejects a non-string account', () => {
        assert.equal(hasConstraint(errorsFor(NewRelayerAccountDTO, { account: 1 }), 'account', 'isString'), true);
    });
});

describe('PolicyParametersDTO', () => {
    it('accepts a minimal valid instance', () => {
        assert.equal(isClean(errorsFor(PolicyParametersDTO, { policyId: 'p' })), true);
    });

    it('requires policyId', () => {
        assert.equal(hasConstraint(errorsFor(PolicyParametersDTO, {}), 'policyId', 'isString'), true);
    });

    it('rejects a non-boolean updated', () => {
        assert.equal(hasConstraint(errorsFor(PolicyParametersDTO, { policyId: 'p', updated: 'x' }), 'updated', 'isBoolean'), true);
    });

    it('rejects a non-array config', () => {
        assert.equal(hasConstraint(errorsFor(PolicyParametersDTO, { policyId: 'p', config: {} }), 'config', 'isArray'), true);
    });

    it('accepts an empty config array', () => {
        assert.equal(isClean(errorsFor(PolicyParametersDTO, { policyId: 'p', config: [] })), true);
    });
});
