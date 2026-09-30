import assert from 'node:assert/strict';
import { ListenerScheduler } from '../dist/api/listener-scheduler.js';
import { Listener } from '../dist/api/listener.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fake = (name, { fast = false, due = true, run } = {}) => ({
    name,
    latencySensitive: fast,
    calls: 0,
    concurrent: 0,
    maxConcurrent: 0,
    isPollDue() { return due; },
    async search() {
        this.calls++;
        this.concurrent++;
        this.maxConcurrent = Math.max(this.maxConcurrent, this.concurrent);
        try {
            if (run) {
                await run(this);
            }
        } finally {
            this.concurrent--;
        }
        return true;
    },
});

const make = (listeners, options = {}) => new ListenerScheduler(() => listeners, {
    concurrency: 5,
    callDelay: 0,
    passDelay: 10000,
    fastTick: 10,
    ...options,
});

describe('ListenerScheduler', () => {
    it('never runs more searches at once than the concurrency cap', async () => {
        let active = 0;
        let peak = 0;
        const run = async () => {
            active++;
            peak = Math.max(peak, active);
            await sleep(20);
            active--;
        };
        const listeners = Array.from({ length: 8 }, (_, i) => fake(`l${i}`, { run }));
        await make(listeners, { concurrency: 3 }).runPass(false);
        assert.equal(peak, 3);
        assert.ok(listeners.every((l) => l.calls === 1));
    });

    it('does not let one hung listener block the others', async () => {
        const hung = fake('hung', { run: () => new Promise(() => { }) });
        const others = [fake('a'), fake('b'), fake('c')];
        const scheduler = make([hung, ...others]);
        scheduler.runPass(false).then();
        await sleep(30);
        assert.deepEqual(others.map((l) => l.calls), [1, 1, 1]);
        assert.equal(hung.calls, 1);
    });

    it('skips a listener that is still searching (no two searches at once)', async () => {
        let release;
        const slow = fake('slow', { run: () => new Promise((resolve) => { release = resolve; }) });
        const scheduler = make([slow]);
        scheduler.runPass(false).then();
        await sleep(10);
        await scheduler.runPass(false);
        await scheduler.runPass(false);
        assert.equal(slow.calls, 1);
        assert.equal(slow.maxConcurrent, 1);
        release();
    });

    it('paces mirror node calls globally even when they run in parallel', async () => {
        const starts = [];
        const run = async () => { starts.push(Date.now()); };
        const listeners = Array.from({ length: 4 }, (_, i) => fake(`l${i}`, { run }));
        await make(listeners, { callDelay: 40 }).runPass(false);
        for (let i = 1; i < starts.length; i++) {
            assert.ok(starts[i] - starts[i - 1] >= 35, `gap ${starts[i] - starts[i - 1]}`);
        }
    });

    it('does not pace or hold a permit for listeners that are not due', async () => {
        const idle = Array.from({ length: 4 }, (_, i) => fake(`i${i}`, { due: false }));
        const started = Date.now();
        await make(idle, { callDelay: 200, concurrency: 1 }).runPass(false);
        assert.ok(Date.now() - started < 100);
        assert.ok(idle.every((l) => l.calls === 1));
    });

    it('polls latency-sensitive listeners on their own loop, not on the pass delay', async () => {
        const fastListener = fake('fast', { fast: true });
        const regular = fake('regular');
        const scheduler = make([fastListener, regular], { passDelay: 10000, fastTick: 10 });
        scheduler.start();
        await sleep(120);
        scheduler.stop();
        assert.ok(fastListener.calls >= 5, `fast polled ${fastListener.calls} times`);
        //regular listeners keep the pass delay: one pass, then a 10 s pause
        assert.equal(regular.calls, 1);
    });

    it('keeps regular and fast listeners in their own passes', async () => {
        const fastListener = fake('fast', { fast: true });
        const regular = fake('regular');
        const scheduler = make([fastListener, regular]);
        await scheduler.runPass(false);
        assert.deepEqual([fastListener.calls, regular.calls], [0, 1]);
        await scheduler.runPass(true);
        assert.deepEqual([fastListener.calls, regular.calls], [1, 1]);
    });

    it('serves latency-sensitive listeners first when permits are scarce', async () => {
        const order = [];
        const run = async (l) => { order.push(l.name); await sleep(20); };
        const first = fake('first', { run });
        const regular = fake('regular', { run });
        const fastListener = fake('fast', { fast: true, run });
        const scheduler = make([first, regular, fastListener], { concurrency: 1 });
        await Promise.all([scheduler.runPass(false), sleep(5).then(() => scheduler.runPass(true))]);
        assert.deepEqual(order, ['first', 'fast', 'regular']);
    });
});

describe('Listener latency-sensitive profile', () => {
    const make = (overrides = {}) => new Listener({
        subscribe() { return { unsubscribe() { } }; },
        async publish() { },
    }, {
        id: 'l1', name: 'n', topicId: '0.0.1', searchIndex: 1, sendIndex: 1, ...overrides,
    });

    it('is a regular listener by default', () => {
        assert.equal(make().latencySensitive, false);
    });

    it('idles on the short cap, however long it has been silent', () => {
        const listener = make({ latencySensitive: true });
        for (let i = 0; i < 20; i++) {
            listener.onPollSuccess(false);
            const delay = listener._nextPollAt - Date.now();
            assert.ok(delay <= Listener.FAST_IDLE_BACKOFF_MAX_MS, `idle ${delay}`);
            assert.ok(delay >= Listener.FAST_IDLE_BACKOFF_MAX_MS * 0.75, `idle ${delay}`);
        }
        assert.ok(Listener.FAST_IDLE_BACKOFF_MAX_MS < Listener.IDLE_BACKOFF_MAX_MS);
    });

    it('still backs off on errors like a regular listener', () => {
        const listener = make({ latencySensitive: true });
        const delay = listener.onPollError(new Error('boom'));
        assert.ok(delay >= Listener.ERROR_BACKOFF_MIN_MS * 0.75);
        assert.equal(listener.isPollDue(), false);
    });

    it('keeps the regular idle backoff for unmarked listeners', () => {
        const listener = make();
        listener.onPollSuccess(false);
        const first = listener._nextPollAt - Date.now();
        assert.ok(first >= Listener.IDLE_BACKOFF_STEP_MS * 0.75, `first idle ${first}`);
        assert.ok(first > Listener.FAST_IDLE_BACKOFF_MAX_MS);
        listener.onPollSuccess(false);
        assert.ok(listener._nextPollAt - Date.now() > first, 'doubles');
    });
});
