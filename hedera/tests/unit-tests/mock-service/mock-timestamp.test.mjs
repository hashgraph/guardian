import assert from 'node:assert/strict';
import { MockHelper } from '../../../dist/mock-service.js';

describe('MockHelper.getMessageRecord timestamps', () => {
    let originalNow;
    let originalRandom;

    beforeEach(() => {
        originalNow = Date.now;
        originalRandom = Math.random;
        Date.now = () => 1795474576767;
        Math.random = () => 0.123456;
    });

    afterEach(() => {
        Date.now = originalNow;
        Math.random = originalRandom;
    });

    it('uses the current seconds, milliseconds and random suffix for both timestamp fields', () => {
        const { transaction } = MockHelper.getMessageRecord('0.0.123', 'message', '0.0.456');

        assert.equal(transaction.id, '1795474576.767123456');
        assert.equal(transaction.consensus_timestamp, transaction.id);
    });

    it('keeps the message date in the current year', () => {
        const { transaction } = MockHelper.getMessageRecord('0.0.123', 'message', '0.0.456');
        const seconds = Number(transaction.id.split('.')[0]);

        assert.equal(new Date(seconds * 1000).getUTCFullYear(), 2026);
    });

    it('keeps nanoseconds below one second at the end of a second', () => {
        Date.now = () => 1795474576999;
        Math.random = () => 0.9999999;

        const { transaction } = MockHelper.getMessageRecord('0.0.123', 'message', '0.0.456');
        const nanos = Number(transaction.id.split('.')[1]);

        assert.equal(transaction.id, '1795474576.999999999');
        assert.equal(transaction.consensus_timestamp, transaction.id);
        assert.ok(nanos >= 0 && nanos < 1000000000);
    });

    it('pads zero nanoseconds to nine digits at the start of a second', () => {
        Date.now = () => 1795474576000;
        Math.random = () => 0;

        const { transaction } = MockHelper.getMessageRecord('0.0.123', 'message', '0.0.456');

        assert.equal(transaction.id, '1795474576.000000000');
        assert.equal(transaction.consensus_timestamp, transaction.id);
    });

    it('distinguishes messages in the same millisecond using different random suffixes', () => {
        const first = MockHelper.getMessageRecord('0.0.123', 'first', '0.0.456').transaction;
        Math.random = () => 0.654321;
        const second = MockHelper.getMessageRecord('0.0.123', 'second', '0.0.456').transaction;

        assert.equal(first.id, '1795474576.767123456');
        assert.equal(second.id, '1795474576.767654321');
        assert.notEqual(first.id, second.id);
        assert.equal(first.consensus_timestamp, first.id);
        assert.equal(second.consensus_timestamp, second.id);
    });
});
