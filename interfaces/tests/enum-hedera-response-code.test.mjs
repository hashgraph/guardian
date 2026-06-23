import assert from 'node:assert/strict';
import { HederaResponseCode } from '../dist/type/hedera-response-code.type.js';

describe('HederaResponseCode enum', () => {
    it('exposes representative Hedera consensus error codes', () => {
        assert.equal(HederaResponseCode.OK, 'OK');
        assert.equal(HederaResponseCode.SUCCESS, 'SUCCESS');
        assert.equal(HederaResponseCode.BUSY, 'BUSY');
        assert.equal(HederaResponseCode.INVALID_SIGNATURE, 'INVALID_SIGNATURE');
        assert.equal(HederaResponseCode.INSUFFICIENT_PAYER_BALANCE, 'INSUFFICIENT_PAYER_BALANCE');
        assert.equal(HederaResponseCode.UNKNOWN, 'UNKNOWN');
    });
    it('keys equal values (uppercase string enum)', () => {
        for (const [k, v] of Object.entries(HederaResponseCode)) {
            assert.equal(k, v);
        }
    });
});
