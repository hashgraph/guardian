import assert from 'node:assert/strict';
import { Tasks } from '../dist/helpers/tasks.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('Tasks.start', () => {
    it('runs the callback once per item, in order', async () => {
        const items = [1, 2, 3, 4];
        const seen = [];
        const t = new Tasks(items, async (n) => { seen.push(n); });
        await t.start();
        assert.deepEqual(seen, items);
    });

    it('is a no-op for an empty list', async () => {
        let count = 0;
        const t = new Tasks([], async () => { count++; });
        await t.start();
        assert.equal(count, 0);
    });

    it('propagates an error thrown by the callback', async () => {
        const t = new Tasks([1, 2, 3], async (n) => {
            if (n === 2) throw new Error('boom');
        });
        await assert.rejects(() => t.start(), /boom/);
    });
});

describe('Tasks.run (parallel workers)', () => {
    it('processes every truthy item exactly once across workers', async () => {
        // items must be truthy: the underlying loop terminates on a falsy next()
        const items = Array.from({ length: 20 }, (_, i) => i + 1);
        const seen = new Set();
        const t = new Tasks(items, async (n) => {
            // small async gap so multiple workers actually overlap
            await tick();
            assert.ok(!seen.has(n), `item ${n} processed twice`);
            seen.add(n);
        });
        await t.run(4);
        assert.equal(seen.size, items.length);
    });

    it('stops at the first falsy item (documented limitation of next())', async () => {
        // 0 is falsy and terminates the loop; subsequent items are skipped
        const items = [1, 2, 0, 3, 4];
        const seen = [];
        const t = new Tasks(items, async (n) => { seen.push(n); });
        await t.start();
        assert.deepEqual(seen, [1, 2]);
    });

    it('actually runs callbacks concurrently when count > 1', async () => {
        const items = [1, 2, 3, 4, 5, 6];
        let inFlight = 0;
        let maxInFlight = 0;
        const t = new Tasks(items, async () => {
            inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await tick();
            inFlight--;
        });
        await t.run(3);
        assert.ok(maxInFlight >= 2,
            `expected concurrent execution but maxInFlight was ${maxInFlight}`);
    });

    it('is a no-op when count is 0', async () => {
        let calls = 0;
        const t = new Tasks([1, 2, 3], async () => { calls++; });
        await t.run(0);
        assert.equal(calls, 0);
    });

    it('does not exceed the item count even when count > items.length', async () => {
        const items = [1, 2];
        let calls = 0;
        const t = new Tasks(items, async () => { calls++; });
        await t.run(10);
        assert.equal(calls, 2);
    });
});
