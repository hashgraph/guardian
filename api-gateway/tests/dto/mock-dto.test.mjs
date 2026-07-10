import assert from 'node:assert/strict';
import { errorsFor, hasConstraint, isClean } from './_dto-helper.mjs';
import {
    MockBlockConfigDTO,
    MockConfigDTO,
    MockIpfsDataDTO,
    MockTopicTransactionDTO,
    MockMessageTransactionDTO,
    MockTopicDataDTO,
    MockTokenDataDTO,
    MockRequestConfigDTO,
    MockDataDTO,
    MockIpfsRequestDTO,
} from '../../dist/middlewares/validation/schemas/mock.dto.js';

describe('MockBlockConfigDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(MockBlockConfigDTO, {})), true);
    });

    it('accepts a valid block config', () => {
        assert.equal(isClean(errorsFor(MockBlockConfigDTO, { uuid: 'u', enabled: true })), true);
    });

    it('rejects a non-boolean enabled', () => {
        assert.equal(hasConstraint(errorsFor(MockBlockConfigDTO, { enabled: 'yes' }), 'enabled', 'isBoolean'), true);
    });

    it('rejects a non-string uuid', () => {
        assert.equal(hasConstraint(errorsFor(MockBlockConfigDTO, { uuid: 5 }), 'uuid', 'isString'), true);
    });
});

describe('MockConfigDTO', () => {
    it('accepts a valid config', () => {
        assert.equal(isClean(errorsFor(MockConfigDTO, { enabled: false, blocks: [] })), true);
    });

    it('rejects a non-array blocks', () => {
        assert.equal(hasConstraint(errorsFor(MockConfigDTO, { blocks: {} }), 'blocks', 'isArray'), true);
    });
});

describe('MockIpfsDataDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(MockIpfsDataDTO, {})), true);
    });

    it('rejects a non-string cid', () => {
        assert.equal(hasConstraint(errorsFor(MockIpfsDataDTO, { cid: 5 }), 'cid', 'isString'), true);
    });
});

describe('MockTopicTransactionDTO', () => {
    it('accepts a valid topic transaction', () => {
        const errs = errorsFor(MockTopicTransactionDTO, { id: '0.0.1', memo: 'memo', payer_account_id: '0.0.2', topic_id: '0.0.3' });
        assert.equal(isClean(errs), true);
    });

    it('rejects a non-string payer_account_id', () => {
        assert.equal(hasConstraint(errorsFor(MockTopicTransactionDTO, { payer_account_id: 5 }), 'payer_account_id', 'isString'), true);
    });
});

describe('MockMessageTransactionDTO', () => {
    it('accepts a valid message transaction', () => {
        const errs = errorsFor(MockMessageTransactionDTO, {
            consensus_timestamp: '1',
            id: '2',
            message: 'base64',
            payer_account_id: '0.0.1',
            sequence_number: 3,
            topicId: '0.0.2',
            topic_id: '0.0.2',
        });
        assert.equal(isClean(errs), true);
    });

    it('rejects a non-number sequence_number', () => {
        assert.equal(hasConstraint(errorsFor(MockMessageTransactionDTO, { sequence_number: 'x' }), 'sequence_number', 'isNumber'), true);
    });

    it('rejects a non-string message', () => {
        assert.equal(hasConstraint(errorsFor(MockMessageTransactionDTO, { message: 1 }), 'message', 'isString'), true);
    });
});

describe('MockTopicDataDTO', () => {
    it('accepts a valid topic data', () => {
        assert.equal(isClean(errorsFor(MockTopicDataDTO, { topicId: '0.0.1', topic: {}, messages: [] })), true);
    });

    it('rejects a non-object topic', () => {
        assert.equal(hasConstraint(errorsFor(MockTopicDataDTO, { topic: 'x' }), 'topic', 'isObject'), true);
    });

    it('rejects a non-array messages', () => {
        assert.equal(hasConstraint(errorsFor(MockTopicDataDTO, { messages: {} }), 'messages', 'isArray'), true);
    });
});

describe('MockTokenDataDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(MockTokenDataDTO, {})), true);
    });

    it('rejects a non-boolean admin_key', () => {
        assert.equal(hasConstraint(errorsFor(MockTokenDataDTO, { admin_key: 'x' }), 'admin_key', 'isBoolean'), true);
    });
});

describe('MockRequestConfigDTO', () => {
    it('accepts a valid request config', () => {
        assert.equal(isClean(errorsFor(MockRequestConfigDTO, { method: 'GET', responseType: 'JSON', url: 'http://localhost/' })), true);
    });

    it('rejects a non-string method', () => {
        assert.equal(hasConstraint(errorsFor(MockRequestConfigDTO, { method: 1 }), 'method', 'isString'), true);
    });
});

describe('MockDataDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(MockDataDTO, {})), true);
    });

    it('accepts arrays for all sections', () => {
        assert.equal(isClean(errorsFor(MockDataDTO, { ipfs: [], topics: [], tokens: [], api: [], users: [] })), true);
    });

    it('rejects a non-array ipfs', () => {
        assert.equal(hasConstraint(errorsFor(MockDataDTO, { ipfs: {} }), 'ipfs', 'isArray'), true);
    });

    it('rejects a non-array users', () => {
        assert.equal(hasConstraint(errorsFor(MockDataDTO, { users: 'x' }), 'users', 'isArray'), true);
    });
});

describe('MockIpfsRequestDTO', () => {
    it('accepts an empty instance', () => {
        assert.equal(isClean(errorsFor(MockIpfsRequestDTO, {})), true);
    });

    it('rejects a non-string cid', () => {
        assert.equal(hasConstraint(errorsFor(MockIpfsRequestDTO, { cid: 1 }), 'cid', 'isString'), true);
    });
});
