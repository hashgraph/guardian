import assert from 'node:assert/strict';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const link = (source, target, type = 'RunEvent') => ({
    source: { uuid: source, tag: source },
    target: { uuid: target, tag: target },
    type,
});

describe('RecordActionStep', () => {
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    let scheduled;
    let nextTimerId;

    const flush = () => {
        const pending = scheduled;
        scheduled = [];
        for (const t of pending) {
            t.fn();
        }
    };

    beforeEach(() => {
        scheduled = [];
        nextTimerId = 1;
        globalThis.setTimeout = (fn, delay) => {
            const id = nextTimerId++;
            scheduled.push({ id, fn, delay });
            return id;
        };
        globalThis.clearTimeout = (id) => {
            scheduled = scheduled.filter((t) => t.id !== id);
        };
    });

    afterEach(() => {
        globalThis.setTimeout = realSetTimeout;
        globalThis.clearTimeout = realClearTimeout;
    });

    describe('construction', () => {
        it('applies defaults', () => {
            const step = new RecordActionStep(() => {});
            assert.equal(step.counter, 0);
            assert.equal(step.syncActions, false);
            assert.equal(step.withHistory, false);
            assert.equal(typeof step.id, 'string');
            assert.ok(step.id.length > 0);
            assert.equal(typeof step.timestemp, 'number');
        });

        it('honors initialCounter and the sync/history flags', () => {
            const step = new RecordActionStep(() => {}, 3, true, true);
            assert.equal(step.counter, 3);
            assert.equal(step.syncActions, true);
            assert.equal(step.withHistory, true);
        });
    });

    describe('checkCycle', () => {
        it('throws when a target node is reused with the same type', () => {
            const step = new RecordActionStep(() => {});
            step.checkCycle(link('A', 'B'));
            assert.throws(() => step.checkCycle(link('C', 'B')), /Cycle detected/);
        });

        it('allows distinct nodes', () => {
            const step = new RecordActionStep(() => {});
            step.checkCycle(link('A', 'B'));
            assert.doesNotThrow(() => step.checkCycle(link('X', 'Y')));
        });

        it('treats an earlier source as an already-used node', () => {
            const step = new RecordActionStep(() => {});
            step.checkCycle(link('A', 'B'));
            assert.throws(() => step.checkCycle(link('D', 'A')), /Cycle detected/);
        });

        it('distinguishes nodes by event type', () => {
            const step = new RecordActionStep(() => {});
            step.checkCycle(link('A', 'B', 'RunEvent'));
            assert.doesNotThrow(() => step.checkCycle(link('C', 'B', 'RefreshEvent')));
        });
    });

    describe('saveResult / getResults', () => {
        it('stores a deep clone when both history and sync are enabled', () => {
            const step = new RecordActionStep(() => {}, 0, true, true);
            const payload = { n: 1 };
            step.saveResult(payload);
            payload.n = 99;
            assert.deepEqual(step.getResults(), [{ n: 1 }]);
        });

        it('is a no-op when sync actions are enabled but history is not', () => {
            const step = new RecordActionStep(() => {}, 0, true, false);
            step.saveResult({ n: 1 });
            assert.deepEqual(step.getResults(), []);
        });

        it('is a no-op under the defaults', () => {
            const step = new RecordActionStep(() => {});
            step.saveResult({ n: 1 });
            assert.deepEqual(step.getResults(), []);
        });
    });

    describe('counter', () => {
        it('inc increments and dec decrements, flooring at zero', () => {
            const step = new RecordActionStep(() => {});
            step.inc();
            step.inc();
            assert.equal(step.counter, 2);
            step.dec();
            assert.equal(step.counter, 1);
            step.dec();
            assert.equal(step.counter, 0);
            step.dec();
            assert.equal(step.counter, 0);
        });
    });

    describe('finish callback', () => {
        it('fires once, after a delay, when the counter reaches zero', () => {
            const calls = [];
            const step = new RecordActionStep((id, ts) => calls.push([id, ts]), 1);
            step.dec();
            assert.equal(calls.length, 0);
            assert.equal(scheduled.length, 1);
            assert.equal(scheduled[0].delay, 1000);
            flush();
            assert.deepEqual(calls, [[step.id, step.timestemp]]);
        });

        it('does not schedule the callback while the counter is above zero', () => {
            const calls = [];
            const step = new RecordActionStep(() => calls.push(1), 2);
            step.dec();
            assert.equal(step.counter, 1);
            flush();
            assert.equal(calls.length, 0);
        });

        it('inc cancels a pending callback', () => {
            const calls = [];
            const step = new RecordActionStep(() => calls.push(1), 1);
            step.dec();
            step.inc();
            flush();
            assert.equal(calls.length, 0);
            assert.equal(step.counter, 1);
        });

        it('fires the callback at most once', () => {
            const calls = [];
            const step = new RecordActionStep(() => calls.push(1), 1);
            step.dec();
            flush();
            step.finish();
            flush();
            assert.equal(calls.length, 1);
        });
    });
});
