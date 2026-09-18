import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, isClean } from './_dto-helper.mjs';
import {
    ExternalPolicyDTO,
    PolicyRequestDTO,
    PolicyRequestCountDTO,
} from '../../dist/middlewares/validation/schemas/external-policies.dto.js';

describe('ExternalPolicyDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(ExternalPolicyDTO, {})), true);
    });

    it('accepts a fully populated payload', () => {
        const errs = errorsFor(ExternalPolicyDTO, {
            uuid: 'u', name: 'n', description: 'd', version: '1.0.0', topicId: '0.0.1',
            instanceTopicId: '0.0.2', messageId: 'm', policyTag: 't', owner: 'o',
            status: 'NEW', username: 'user',
        });
        assert.equal(isClean(errs), true);
    });

    for (const field of ['uuid', 'name', 'description', 'version', 'topicId', 'instanceTopicId', 'messageId', 'policyTag', 'owner', 'status', 'username']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(ExternalPolicyDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }
});

describe('PolicyRequestDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyRequestDTO, {})), true);
    });

    it('accepts a populated payload', () => {
        const errs = errorsFor(PolicyRequestDTO, {
            uuid: 'u', type: 'ACTION', messageId: 'm', startMessageId: 's', status: 'NEW',
            lastStatus: 'NEW', accountId: '0.0.1', sender: '0.0.2', owner: 'o', topicId: '0.0.3',
            document: {}, policyId: 'p', blockTag: 'b', policyMessageId: 'pm', loaded: true,
        });
        assert.equal(isClean(errs), true);
    });

    for (const field of ['uuid', 'type', 'messageId', 'startMessageId', 'status', 'lastStatus', 'accountId', 'sender', 'owner', 'topicId', 'policyId', 'blockTag', 'policyMessageId']) {
        it(`rejects a non-string ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(PolicyRequestDTO, { [field]: 5 }), field, 'isString'), true);
        });
    }

    it('rejects a non-object document', () => {
        assert.equal(hasConstraint(errorsFor(PolicyRequestDTO, { document: 'x' }), 'document', 'isObject'), true);
    });

    it('rejects a non-boolean loaded', () => {
        assert.equal(hasConstraint(errorsFor(PolicyRequestDTO, { loaded: 'x' }), 'loaded', 'isBoolean'), true);
    });
});

describe('PolicyRequestCountDTO', () => {
    it('accepts an empty payload', () => {
        assert.equal(isClean(errorsFor(PolicyRequestCountDTO, {})), true);
    });

    it('accepts valid numeric counts', () => {
        assert.equal(isClean(errorsFor(PolicyRequestCountDTO, { requestsCount: 1, actionsCount: 2, delayCount: 0, total: 3 })), true);
    });

    for (const field of ['requestsCount', 'actionsCount', 'delayCount', 'total']) {
        it(`rejects a non-number ${field}`, () => {
            assert.equal(hasConstraint(errorsFor(PolicyRequestCountDTO, { [field]: 'x' }), field, 'isNumber'), true);
        });
    }
});
