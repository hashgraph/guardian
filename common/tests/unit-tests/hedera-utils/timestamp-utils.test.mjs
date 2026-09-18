import { assert } from 'chai';
import { TimestampUtils } from '../../../dist/hedera-modules/timestamp-utils.js';
import { Timestamp } from '@hiero-ledger/sdk';

describe('TimestampUtils.now', () => {
    it('returns a Timestamp close to "now"', () => {
        const before = Date.now();
        const t = TimestampUtils.now();
        const after = Date.now();
        const ms = t.toDate().getTime();
        assert.isAtLeast(ms, before - 5);
        assert.isAtMost(ms, after + 5);
    });
});

describe('TimestampUtils.toJSON / fromJson', () => {
    it('round-trips the ISO format', () => {
        const date = new Date('2024-06-15T12:34:56.789Z');
        const t = Timestamp.fromDate(date);
        const json = TimestampUtils.toJSON(t);
        assert.equal(json, '2024-06-15T12:34:56.789Z');
        const back = TimestampUtils.fromJson(json);
        assert.equal(back.toDate().toISOString(), date.toISOString());
    });

    it('round-trips the ISO8601 (second-precision) format', () => {
        const date = new Date('2024-06-15T12:34:56.000Z');
        const t = Timestamp.fromDate(date);
        const json = TimestampUtils.toJSON(t, TimestampUtils.ISO8601);
        assert.equal(json, '2024-06-15T12:34:56Z');
        const back = TimestampUtils.fromJson(json, TimestampUtils.ISO8601);
        assert.equal(back.toDate().toISOString(), date.toISOString());
    });

    it('exposes the documented ISO format strings', () => {
        assert.equal(TimestampUtils.ISO, 'YYYY-MM-DDTHH:mm:ss.SSS[Z]');
        assert.equal(TimestampUtils.ISO8601, 'YYYY-MM-DDTHH:mm:ss[Z]');
    });
});

describe('TimestampUtils.equals', () => {
    it('returns true for the identical reference', () => {
        const t = TimestampUtils.now();
        assert.isTrue(TimestampUtils.equals(t, t));
    });

    it('returns true for two timestamps representing the same instant', () => {
        const date = new Date('2024-01-01T00:00:00.123Z');
        const a = Timestamp.fromDate(date);
        const b = Timestamp.fromDate(date);
        assert.isTrue(TimestampUtils.equals(a, b));
    });

    it('returns false when seconds differ', () => {
        const a = Timestamp.fromDate(new Date('2024-01-01T00:00:00.000Z'));
        const b = Timestamp.fromDate(new Date('2024-01-01T00:00:01.000Z'));
        assert.isFalse(TimestampUtils.equals(a, b));
    });

    it('returns false when nanos differ', () => {
        const a = Timestamp.fromDate(new Date('2024-01-01T00:00:00.111Z'));
        const b = Timestamp.fromDate(new Date('2024-01-01T00:00:00.222Z'));
        assert.isFalse(TimestampUtils.equals(a, b));
    });

    it('returns false when either side is null/undefined', () => {
        const t = TimestampUtils.now();
        assert.isFalse(TimestampUtils.equals(t, null));
        assert.isFalse(TimestampUtils.equals(null, t));
        assert.isFalse(TimestampUtils.equals(undefined, t));
    });
});

describe('TimestampUtils.lessThan', () => {
    it('returns false for the identical reference', () => {
        const t = TimestampUtils.now();
        assert.isFalse(TimestampUtils.lessThan(t, t));
    });

    it('returns true when nanos are smaller within the same second', () => {
        const a = Timestamp.fromDate(new Date('2024-01-01T00:00:00.100Z'));
        const b = Timestamp.fromDate(new Date('2024-01-01T00:00:00.200Z'));
        assert.isTrue(TimestampUtils.lessThan(a, b));
    });

    it('returns false when either side is null/undefined', () => {
        const t = TimestampUtils.now();
        assert.isFalse(TimestampUtils.lessThan(t, null));
        assert.isFalse(TimestampUtils.lessThan(null, t));
    });
});
