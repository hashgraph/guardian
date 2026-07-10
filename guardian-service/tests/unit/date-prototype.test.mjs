import assert from 'node:assert/strict';

await import('../../dist/prototypes/date-prototype.js');

describe('@unit Date.prototype.addDays', () => {
    it('exists on Date.prototype after the module loads', () => {
        assert.equal(typeof Date.prototype.addDays, 'function');
    });

    it('returns a Date offset by the given days (positive)', () => {
        const start = new Date('2026-05-01T12:00:00Z');
        const out = start.addDays(10);
        assert.equal(out.toISOString().slice(0, 10), '2026-05-11');
    });

    it('returns a Date offset by negative days (subtraction)', () => {
        const start = new Date('2026-05-10T12:00:00Z');
        const out = start.addDays(-5);
        assert.equal(out.toISOString().slice(0, 10), '2026-05-05');
    });

    it('handles month-end overflow (Feb 28 + 5 days → Mar 5 in non-leap year)', () => {
        const start = new Date('2026-02-28T00:00:00Z');
        const out = start.addDays(5);
        // 2026 is non-leap → 28 + 5 = Mar 5
        assert.equal(out.getUTCMonth(), 2); // March (0-indexed)
        assert.equal(out.getUTCDate(), 5);
    });

    it('handles year-end overflow (Dec 31 + 1 → Jan 1 next year)', () => {
        const start = new Date('2026-12-31T00:00:00Z');
        const out = start.addDays(1);
        assert.equal(out.getUTCFullYear(), 2027);
    });

    it('returns a NEW Date instance — does not mutate the receiver', () => {
        const start = new Date('2026-05-01T00:00:00Z');
        const original = start.getTime();
        const out = start.addDays(7);
        assert.notStrictEqual(out, start);
        assert.equal(start.getTime(), original);
    });

    it('addDays(0) returns an equivalent Date (clone)', () => {
        const start = new Date('2026-05-01T12:34:56Z');
        const out = start.addDays(0);
        assert.notStrictEqual(out, start);
        assert.equal(out.getTime(), start.getTime());
    });

    it('preserves the time-of-day on the returned Date', () => {
        const start = new Date('2026-05-01T15:30:45.500Z');
        const out = start.addDays(3);
        assert.equal(out.getUTCHours(), start.getUTCHours());
        assert.equal(out.getUTCMinutes(), start.getUTCMinutes());
        assert.equal(out.getUTCSeconds(), start.getUTCSeconds());
        assert.equal(out.getUTCMilliseconds(), start.getUTCMilliseconds());
    });
});
