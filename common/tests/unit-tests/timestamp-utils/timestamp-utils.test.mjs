import assert from 'node:assert/strict';
import { Timestamp } from '@hiero-ledger/sdk';
import { TimestampUtils } from '../../../dist/hedera-modules/timestamp-utils.js';

describe('TimestampUtils.now', () => {
    it('returns a Timestamp instance', () => {
        const t = TimestampUtils.now();
        assert.ok(t instanceof Timestamp);
    });

    it('approximates the current Date (within 1s)', () => {
        const before = Date.now();
        const t = TimestampUtils.now();
        const after = Date.now();
        const tMs = t.toDate().getTime();
        assert.ok(tMs >= before - 1000);
        assert.ok(tMs <= after + 1000);
    });
});

describe('TimestampUtils.toJSON / fromJson round-trip', () => {
    it('round-trips a known UTC date through ISO', () => {
        const date = new Date(Date.UTC(2024, 0, 2, 3, 4, 5, 678));
        const ts = Timestamp.fromDate(date);
        const json = TimestampUtils.toJSON(ts);
        assert.equal(json, '2024-01-02T03:04:05.678Z');
        const parsed = TimestampUtils.fromJson(json);
        assert.equal(parsed.toDate().getTime(), date.getTime());
    });

    it('round-trips ISO8601 (no millis) format', () => {
        const date = new Date(Date.UTC(2024, 0, 2, 3, 4, 5, 0));
        const ts = Timestamp.fromDate(date);
        const json = TimestampUtils.toJSON(ts, TimestampUtils.ISO8601);
        assert.equal(json, '2024-01-02T03:04:05Z');
        const parsed = TimestampUtils.fromJson(json, TimestampUtils.ISO8601);
        assert.equal(parsed.toDate().getTime(), date.getTime());
    });

    it('exposes the documented format constants', () => {
        assert.equal(TimestampUtils.ISO, 'YYYY-MM-DDTHH:mm:ss.SSS[Z]');
        assert.equal(TimestampUtils.ISO8601, 'YYYY-MM-DDTHH:mm:ss[Z]');
    });
});

describe('TimestampUtils.equals', () => {
    it('returns true for the same object reference', () => {
        const t = TimestampUtils.now();
        assert.equal(TimestampUtils.equals(t, t), true);
    });

    it('returns false when only one side is null/undefined', () => {
        const t = TimestampUtils.now();
        assert.equal(TimestampUtils.equals(null, t), false);
        assert.equal(TimestampUtils.equals(t, null), false);
    });

    it('returns true when both sides are the same null reference (a === b shortcut)', () => {
        // Documented behavior: identity check fires before the null guard.
        assert.equal(TimestampUtils.equals(null, null), true);
    });

    it('returns true for two timestamps representing the same instant', () => {
        const date = new Date(Date.UTC(2024, 5, 1));
        const a = Timestamp.fromDate(date);
        const b = Timestamp.fromDate(date);
        assert.equal(TimestampUtils.equals(a, b), true);
    });

    it('returns false for two timestamps representing different instants', () => {
        const a = Timestamp.fromDate(new Date(Date.UTC(2024, 0, 1)));
        const b = Timestamp.fromDate(new Date(Date.UTC(2024, 6, 1)));
        assert.equal(TimestampUtils.equals(a, b), false);
    });
});

describe('TimestampUtils.lessThan', () => {
    it('returns false for the same reference', () => {
        const t = TimestampUtils.now();
        assert.equal(TimestampUtils.lessThan(t, t), false);
    });

    it('returns false when either side is null/undefined', () => {
        const t = TimestampUtils.now();
        assert.equal(TimestampUtils.lessThan(null, t), false);
        assert.equal(TimestampUtils.lessThan(t, null), false);
    });

    it('compares nanos when seconds are equal', () => {
        // Build two Timestamps at the same second but different nano resolution.
        const a = new Timestamp(1700000000, 100);
        const b = new Timestamp(1700000000, 200);
        assert.equal(TimestampUtils.lessThan(a, b), true);
    });

    it('returns false when nanos are equal at the same second', () => {
        const a = new Timestamp(1700000000, 100);
        const b = new Timestamp(1700000000, 100);
        // Note: TimestampUtils.lessThan uses Long.lessThan, which is strict.
        assert.equal(TimestampUtils.lessThan(a, b), false);
    });
});
