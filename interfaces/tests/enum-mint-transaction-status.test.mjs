import assert from 'node:assert/strict';
import { MintTransactionStatus } from '../dist/type/mint-transaction-status.type.js';

describe('MintTransactionStatus enum', () => {
    it('exposes NEW / PENDING / ERROR / SUCCESS / NONE', () => {
        for (const k of ['NEW', 'PENDING', 'ERROR', 'SUCCESS', 'NONE']) {
            assert.equal(MintTransactionStatus[k], k);
        }
    });
    it('has exactly five entries', () => {
        assert.equal(Object.keys(MintTransactionStatus).length, 5);
    });
});
