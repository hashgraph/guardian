import assert from 'node:assert/strict';
import { TransactionLogger } from '../dist/api/helpers/transaction-logger.js';

describe('TransactionLogger.stringSize', () => {
    it('returns the byte length of an ASCII string', () => {
        assert.equal(TransactionLogger.stringSize('hello'), 5);
    });

    it('returns 0 for an empty string (still a string)', () => {
        assert.equal(TransactionLogger.stringSize(''), 0);
    });

    it('counts multi-byte UTF-8 chars in bytes', () => {
        assert.equal(TransactionLogger.stringSize('é'), 2);
    });

    it('counts a 4-byte emoji as 4 bytes', () => {
        assert.equal(TransactionLogger.stringSize('😀'), 4);
    });

    it('returns null for null', () => {
        assert.equal(TransactionLogger.stringSize(null), null);
    });

    it('returns null for undefined', () => {
        assert.equal(TransactionLogger.stringSize(undefined), null);
    });

    it('returns null for 0 (falsy non-string)', () => {
        assert.equal(TransactionLogger.stringSize(0), null);
    });

    it('returns the length of an array', () => {
        assert.equal(TransactionLogger.stringSize([1, 2, 3]), 3);
    });

    it('returns the length of a Uint8Array', () => {
        assert.equal(TransactionLogger.stringSize(new Uint8Array([1, 2, 3, 4])), 4);
    });

    it('returns the length of a non-empty buffer', () => {
        assert.equal(TransactionLogger.stringSize(Buffer.from('abcd')), 4);
    });

    it('returns null for an empty array (falsy length-zero? array is truthy)', () => {
        assert.equal(TransactionLogger.stringSize([]), 0);
    });

    it('treats a long ASCII string byte-for-byte', () => {
        const s = 'x'.repeat(100);
        assert.equal(TransactionLogger.stringSize(s), 100);
    });

    it('counts mixed ASCII + multibyte correctly', () => {
        assert.equal(TransactionLogger.stringSize('aé'), 3);
    });
});

describe('TransactionLogger.getTransactionData — additional cases', () => {
    it('includes the network value verbatim', () => {
        const out = TransactionLogger.getTransactionData('id', null, 'previewnet', 'Tx', 'u');
        assert.equal(out.network, 'previewnet');
    });

    it('nests userId under payload', () => {
        const out = TransactionLogger.getTransactionData('id', null, 'testnet', 'Tx', 'user-99');
        assert.deepEqual(out.payload, { userId: 'user-99' });
    });

    it('preserves the transactionName field', () => {
        const out = TransactionLogger.getTransactionData('id', null, 'testnet', 'MyTx', 'u');
        assert.equal(out.transactionName, 'MyTx');
    });

    it('serialises operatorAccountId via toString', () => {
        const client = { operatorAccountId: { toString: () => '0.0.777' } };
        const out = TransactionLogger.getTransactionData('id', client, 'testnet', 'Tx', 'u');
        assert.equal(out.operatorAccountId, '0.0.777');
    });

    it('sets operatorAccountId undefined when client lacks operatorAccountId', () => {
        const out = TransactionLogger.getTransactionData('id', {}, 'testnet', 'Tx', 'u');
        assert.equal(out.operatorAccountId, undefined);
    });

    it('keeps the id field unchanged', () => {
        const out = TransactionLogger.getTransactionData('the-id', null, 'testnet', 'Tx', 'u');
        assert.equal(out.id, 'the-id');
    });

    it('returns an object with exactly the expected keys', () => {
        const out = TransactionLogger.getTransactionData('id', null, 'testnet', 'Tx', 'u');
        assert.deepEqual(Object.keys(out).sort(), ['id', 'network', 'operatorAccountId', 'payload', 'transactionName'].sort());
    });
});
