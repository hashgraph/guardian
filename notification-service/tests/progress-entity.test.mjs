import assert from 'node:assert/strict';
import { Progress } from '../dist/entity/progress.entity.js';

describe('Progress.onCreate', () => {
    it('forces progress to 0 regardless of any prior value', () => {
        const p = new Progress();
        p.progress = 42;
        p.onCreate();
        assert.equal(p.progress, 0);
    });

    it('initialises progress to 0 when previously undefined', () => {
        const p = new Progress();
        p.onCreate();
        assert.equal(p.progress, 0);
    });
});

describe('Progress.onUpdate', () => {
    it('floors fractional progress to an integer', () => {
        const p = new Progress();
        p.progress = 37.9;
        p.onUpdate();
        assert.equal(p.progress, 37);
    });

    it('clamps negative values to 0', () => {
        const p = new Progress();
        p.progress = -5;
        p.onUpdate();
        assert.equal(p.progress, 0);
    });

    it('clamps values above 100 to 100', () => {
        const p = new Progress();
        p.progress = 150.7;
        p.onUpdate();
        assert.equal(p.progress, 100);
    });

    it('passes integer progress in range through unchanged', () => {
        const p = new Progress();
        p.progress = 50;
        p.onUpdate();
        assert.equal(p.progress, 50);
    });

    it('treats exactly 100 as in-range (not clamped down)', () => {
        const p = new Progress();
        p.progress = 100;
        p.onUpdate();
        assert.equal(p.progress, 100);
    });

    it('treats exactly 0 as in-range', () => {
        const p = new Progress();
        p.progress = 0;
        p.onUpdate();
        assert.equal(p.progress, 0);
    });

    it('coerces -0.4 to 0 (floor first, then clamp)', () => {
        const p = new Progress();
        p.progress = -0.4;
        p.onUpdate();
        // Math.floor(-0.4) === -1, then clamped to 0
        assert.equal(p.progress, 0);
    });
});
