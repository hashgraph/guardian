import { assert } from 'chai';
import esmock from 'esmock';

/**
 * Coverage for #1934: a pod could end up below capacity, unsealed, and deaf to
 * GENERATE_POLICY while still advertising free slots.
 *
 * unsubscribeFromModelGeneration() dereferenced `generatePolicySubscription`
 * inside its 500ms timer, so it cancelled whatever subscription was current when
 * it fired rather than the one it was scheduled for. A policy exiting inside that
 * window re-subscribes, and the stale timer then tore down that NEW subscription.
 *
 * Measured on dev: two pods sat at 18/25 and 24/25 `Sealed: false` for 99
 * consecutive 10-minute samples (~16.5h) with ~67 policies unhosted. Because they
 * kept reporting free capacity, checkForRunNewInstance's `hasFree` bail-out also
 * stopped every other pod from scaling the fleet up.
 */

const FREE_STATUS = 'FREE_STATUS';
const GENERATE_POLICY = 'GEN';
const GET_FREE = 'GET_FREE';

// Every subscription handed out by the fake broker, so a test can assert exactly
// which one was torn down.
let subscriptions;
let lastForked;
let execFileCalls;

function makeHarness() {
    class FakeNatsService {
        constructor() {}
        async init() {}
        subscribe(event, cb) { this._subs.set(event, cb); }
        getMessages(event, cb) {
            this._msgs.set(event, cb);
            const sub = { event, unsubscribed: false, unsubscribe() { this.unsubscribed = true; } };
            subscriptions.push(sub);
            return sub;
        }
        sendMessage(subject, payload) { this._sent.push({ subject, payload }); }
        publish() { return Promise.resolve(); }
        _subs = new Map();
        _msgs = new Map();
        _sent = [];
    }

    return esmock.strict(
        '../../../dist/helpers/policy-container.js',
        {
            '@guardian/common': {
                MessageResponse: class { constructor(body) { this.body = body; } },
                NatsService: FakeNatsService,
                PinoLogger: class { info() {} error() {} warn() {} },
                Singleton: (target) => target,
            },
            '@guardian/interfaces': {
                GenerateUUIDv4: () => 'uuid-fixed',
                PolicyEvents: {
                    GET_FREE_POLICY_SERVICES: GET_FREE,
                    POLICY_SERVICE_FREE_STATUS: FREE_STATUS,
                    GENERATE_POLICY,
                },
            },
            'node:child_process': {
                ChildProcess: class {},
                fork: () => {
                    // A process stub whose handlers can be fired, so the exit branch
                    // is reachable from a unit test.
                    const handlers = {};
                    const proc = {
                        pid: 1234,
                        on(ev, cb) { handlers[ev] = cb; return proc; },
                        once(ev, cb) { handlers[ev] = cb; return proc; },
                        send() {}, kill() {},
                        _fire(ev, ...args) { return handlers[ev] && handlers[ev](...args); },
                    };
                    lastForked = proc;
                    return proc;
                },
                execFile: (...args) => { execFileCalls.push(args[0]); },
            },
            '../../../dist/api/policy-process-path.js': { POLICY_PROCESS_PATH: '/fake/path.js' },
        },
    );
}

const fakeLogger = { info() {}, error() {}, warn() {} };
const cfg = (policyId) => ({
    policyId, policyServiceName: 'svc',
    skipRegistration: false, policyOwnerId: 'owner', enableMock: false,
});

// init() installs 1s/10m/30m intervals; stub them so nothing lingers past a test.
async function initQuiet(container) {
    const realSetInterval = global.setInterval;
    global.setInterval = () => 0;
    try {
        await container.init();
    } finally {
        global.setInterval = realSetInterval;
    }
}

describe('@unit PolicyContainer GENERATE_POLICY intake race', () => {
    let PolicyContainer;

    beforeEach(async () => {
        subscriptions = []; execFileCalls = [];
        process.env.MAX_POLICY_INSTANCES = '1';
        ({ PolicyContainer } = await makeHarness());
    });

    afterEach(() => {
        delete process.env.MAX_POLICY_INSTANCES;
    });

    it('a re-subscribe inside the 500ms window survives the pending unsubscribe', async () => {
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);

        // Fill the pod, then have a refused add schedule the unsubscribe.
        assert.isTrue(c.addPolicy(cfg('p1')));
        assert.isFalse(c.addPolicy(cfg('p2')), 'second add must be refused at capacity');

        // A policy exits inside the window: the pod drops below capacity and
        // re-subscribes. This is the subscription that used to be destroyed.
        c.container.delete('p1');
        c.subscribeForModelGeneration();
        const live = subscriptions[subscriptions.length - 1];

        await new Promise((resolve) => setTimeout(resolve, 700));

        assert.isFalse(live.unsubscribed, 'the newer subscription must not be torn down');
        assert.isTrue(c.intakeSubscribed, 'pod must still be listening for GENERATE_POLICY');
        assert.isTrue(c.addPolicy(cfg('p3')), 'pod below capacity must accept work again');
    });

    it('still unsubscribes when nothing re-subscribed in the window', async () => {
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);
        const original = subscriptions[subscriptions.length - 1];

        assert.isTrue(c.addPolicy(cfg('p1')));
        assert.isFalse(c.addPolicy(cfg('p2')));

        await new Promise((resolve) => setTimeout(resolve, 700));

        assert.isTrue(original.unsubscribed, 'a full pod should stop taking GENERATE_POLICY');
        assert.isFalse(c.intakeSubscribed);
    });

    it('a pod that is not listening advertises no capacity even when below its limit', async () => {
        // The shape a SIGKILL exit leaves behind: a slot is freed but intake was
        // never re-enabled. Reporting that slot keeps `hasFree` true fleet-wide and
        // blocks scale-up, so an unsubscribed pod must report free=false/count=0.
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);
        const handler = c._subs.get(GET_FREE);
        assert.isFunction(handler, 'GET_FREE handler should be registered');

        c.intakeSubscribed = false;
        c._sent.length = 0;
        handler({ replySubject: 'reply.subject', requestId: 'r1' });

        const reply = c._sent.find((m) => m.subject === 'reply.subject');
        assert.ok(reply, 'a reply should be sent');
        assert.equal(reply.payload.free, false);
        assert.equal(reply.payload.count, 0);
    });

    it('reports capacity again once intake is restored', async () => {
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);
        const handler = c._subs.get(GET_FREE);

        c.intakeSubscribed = false;
        c.subscribeForModelGeneration();

        c._sent.length = 0;
        handler({ replySubject: 'reply.subject', requestId: 'r1' });

        const reply = c._sent.find((m) => m.subject === 'reply.subject');
        assert.equal(reply.payload.free, true);
        assert.equal(reply.payload.count, 1);
    });
});



/*
 *   A. a spawn failure ('error' with no following 'exit') left instance.process
 *      set, so the 1s sweep skipped the policy forever while it still counted
 *      against processCount - a slot held by a policy that was not running
 *   B. a crashing policy re-forked every 10s with no backoff and no ceiling
 */
describe('@unit PolicyContainer spawn failure + crash loop', () => {
    let PolicyContainer;

    beforeEach(async () => {
        subscriptions = []; lastForked = undefined; execFileCalls = [];
        process.env.MAX_POLICY_INSTANCES = '5';
        process.env.POLICY_RESTART_BASE_DELAY_MS = '5';
        process.env.POLICY_MAX_RESTART_ATTEMPTS = '3';
        ({ PolicyContainer } = await makeHarness());
    });
    afterEach(() => {
        delete process.env.MAX_POLICY_INSTANCES;
        delete process.env.POLICY_RESTART_BASE_DELAY_MS;
        delete process.env.POLICY_MAX_RESTART_ATTEMPTS;
    });

    async function withPolicy() {
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);
        c.addPolicy(cfg('p1'));
        return { c, instance: c.container.get('p1') };
    }

    it('A: releases the instance when the process cannot be spawned', async () => {
        const { c, instance } = await withPolicy();
        const origDebug = console.debug; console.debug = () => {};
        try {
            c.runPolicyProcess(instance);
            assert.ok(instance.process, 'a process handle is assigned up front');

            // Spawn failure: Node emits 'error' and 'exit' may never follow.
            lastForked._fire('error', new Error('spawn EAGAIN'));
            // released on the backoff timer, not inline - a spawn that keeps failing
            // is a crash loop and goes through the same ceiling
            await new Promise((r) => setTimeout(r, 20));
        } finally { console.debug = origDebug; }

        assert.isNull(instance.process,
            'the handle must be released or the sweep skips this policy forever');
        assert.isTrue(c.container.has('p1'),
            'the policy itself stays queued for the next sweep');
    });

    it('A2: a spawn that keeps failing gives up instead of retrying forever', async () => {
        const { c, instance } = await withPolicy();
        const origDebug = console.debug; console.debug = () => {};
        try {
            // POLICY_MAX_RESTART_ATTEMPTS is 3 for this suite
            for (let i = 0; i < 3; i++) {
                c.runPolicyProcess(instance);
                lastForked._fire('error', new Error('spawn EAGAIN'));
                await new Promise((r) => setTimeout(r, 20));
            }
        } finally { console.debug = origDebug; }

        assert.isFalse(c.container.has('p1'),
            'the slot is released rather than held by a policy that cannot spawn');
    });

    it('B: backs off between crash respawns instead of a fixed 10s', async () => {
        const { c, instance } = await withPolicy();
        const key = 'p1';
        const delays = [];
        const realSetTimeout = global.setTimeout;
        global.setTimeout = (fn, ms) => { delays.push(ms); return realSetTimeout(fn, 0); };
        const origDebug = console.debug; console.debug = () => {};
        try {
            for (let i = 0; i < 2; i++) {
                c.runPolicyProcess(instance);
                lastForked._fire('exit', 1, null);      // crash, not a clean exit
                await new Promise((r) => realSetTimeout(r, 5));
            }
        } finally { global.setTimeout = realSetTimeout; console.debug = origDebug; }

        assert.equal(c.restartAttempts.get(key), 2, 'attempts are counted per policy');
        assert.isAbove(delays[1], delays[0], 'the delay must grow, not stay fixed');
    });

    it('B: gives up and releases the slot after the attempt ceiling', async () => {
        const { c, instance } = await withPolicy();
        const key = 'p1';
        const realSetTimeout = global.setTimeout;
        global.setTimeout = (fn) => realSetTimeout(fn, 0);
        const origDebug = console.debug; console.debug = () => {};
        try {
            for (let i = 0; i < 3; i++) {
                c.runPolicyProcess(instance);
                lastForked._fire('exit', 1, null);
                await new Promise((r) => realSetTimeout(r, 5));
            }
        } finally { global.setTimeout = realSetTimeout; console.debug = origDebug; }

        assert.isFalse(c.container.has(key),
            'a policy that will not start must not hold a slot forever');
        assert.isFalse(c.restartAttempts.has(key), 'its counter goes with it');
    });

    it('B: a clean exit resets the crash count', async () => {
        const { c, instance } = await withPolicy();
        const key = 'p1';
        const realSetTimeout = global.setTimeout;
        global.setTimeout = (fn) => realSetTimeout(fn, 0);
        const origDebug = console.debug; console.debug = () => {};
        try {
            c.runPolicyProcess(instance);
            lastForked._fire('exit', 1, null);                  // crash
            await new Promise((r) => realSetTimeout(r, 5));
            assert.equal(c.restartAttempts.get(key), 1);

            c.container.set(key, instance);                     // re-added, then exits cleanly
            c.runPolicyProcess(instance);
            lastForked._fire('exit', 0, null);
        } finally { global.setTimeout = realSetTimeout; console.debug = origDebug; }

        assert.isFalse(c.restartAttempts.has(key), 'a healthy stop must not count against it');
    });
});

/*
 * Scale-up used to stop after one round per service. `startNewPolicyServiceTriggered`
 * was a permanent boolean cleared only when a policy EXITED, so a service that
 * filled up and stayed full asked for a replica exactly once in its lifetime. On top
 * of that, `hasFree` bailed out if any peer reported a single free slot, so a nearly
 * saturated fleet never grew.
 */
describe('@unit PolicyContainer scale-up', () => {
    let PolicyContainer;

    const peer = (instanceId, free, count, triggered = false) => ({
        service: 'svc', instanceId, free, count,
        requestId: 'r', startNewPolicyServiceTriggered: triggered,
    });

    // Saturate the service and drive one scaling round against a fixed peer set.
    async function saturated(peers, env = {}) {
        Object.assign(process.env, env);
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);
        c.runServiceScript = '/run.sh';
        for (let i = 0; i < 2; i++) { c.addPolicy(cfg(`p${i}`)); }
        c.getFreePolicyServices = async () => peers;
        return c;
    }

    beforeEach(async () => {
        subscriptions = []; execFileCalls = [];
        process.env.MAX_POLICY_INSTANCES = '2';
        ({ PolicyContainer } = await makeHarness());
    });
    afterEach(() => {
        delete process.env.MAX_POLICY_INSTANCES;
        delete process.env.SCALE_COOLDOWN_MS;
        delete process.env.SCALE_HEADROOM_SLOTS;
    });

    it('scales when the fleet is saturated', async () => {
        const c = await saturated([peer('uuid-fixed', false, 0)]);
        await c.checkForRunNewInstance();
        assert.deepEqual(execFileCalls, ['/run.sh']);
    });

    it('re-arms after the cooldown instead of sealing for the process lifetime', async () => {
        const c = await saturated([peer('uuid-fixed', false, 0)], { SCALE_COOLDOWN_MS: '30' });
        await c.checkForRunNewInstance();
        await c.checkForRunNewInstance();
        assert.lengthOf(execFileCalls, 1, 'the cooldown must suppress the immediate retry');

        await new Promise(r => setTimeout(r, 45));
        await c.checkForRunNewInstance();
        assert.lengthOf(execFileCalls, 2, 'a still-saturated fleet must scale again after the cooldown');
    });

    it('a single free slot elsewhere no longer blocks scaling', async () => {
        // 'zzz' sorts after this service, so this one is the elected scaler and the
        // assertion isolates the headroom rule from the election.
        const c = await saturated([
            peer('uuid-fixed', false, 0),
            peer('zzz', true, 1),
        ]);
        await c.checkForRunNewInstance();
        assert.deepEqual(execFileCalls, ['/run.sh']);
    });

    it('does not scale while the fleet still has a service worth of headroom', async () => {
        const c = await saturated([
            peer('uuid-fixed', false, 0),
            peer('zzz', true, 2),
        ]);
        await c.checkForRunNewInstance();
        assert.lengthOf(execFileCalls, 0);
    });

    it('an empty reply set means nobody answered, not that the fleet is full', async () => {
        const c = await saturated([]);
        await c.checkForRunNewInstance();
        assert.lengthOf(execFileCalls, 0, 'a broker hiccup must not be read as zero capacity');
    });

    it('stands down when a peer is already inside its cooldown', async () => {
        const c = await saturated([
            peer('uuid-fixed', false, 0),
            peer('zzz', false, 0, true),
        ]);
        await c.checkForRunNewInstance();
        assert.lengthOf(execFileCalls, 0, 'only one service may scale per cooldown');
    });

    it('only the elected service scales; the loser holds off', async () => {
        // Election is by instanceId order, and this service is 'uuid-fixed'.
        const c = await saturated([
            peer('aaa', false, 0),
            peer('uuid-fixed', false, 0),
        ]);
        await c.checkForRunNewInstance();
        assert.lengthOf(execFileCalls, 0, 'aaa sorts first and is the elected scaler');
        assert.isTrue(c.startNewPolicyServiceTriggered, 'the loser holds off for the cooldown');
    });

    it('a free peer cannot be elected, however its id sorts', async () => {
        // 'aaa' has capacity, so its own checkForRunNewInstance returns at the first
        // line and it never spawns. Electing it parks the fleet behind a leader that
        // cannot act.
        const c = await saturated([
            peer('aaa', true, 1),
            peer('uuid-fixed', false, 0),
        ]);
        await c.checkForRunNewInstance();
        assert.deepEqual(execFileCalls, ['/run.sh'],
            'the saturated service scales rather than deferring to one with headroom');
        assert.isTrue(c.startNewPolicyServiceTriggered,
            'the cooldown is armed by the service that actually scaled');
    });

    it('an explicit SCALE_HEADROOM_SLOTS=0 is honoured, not read as unset', async () => {
        // 0 means "no buffer": scale only once nothing is free. Read as unset it would
        // fall through to maxPolicyInstances (2 here) and scale with a slot to spare.
        const c = await saturated([
            peer('uuid-fixed', false, 0),
            peer('zzz', true, 1),
        ], { SCALE_HEADROOM_SLOTS: '0' });
        await c.checkForRunNewInstance();
        assert.lengthOf(execFileCalls, 0, 'one free slot is enough when no buffer was asked for');
    });

    it('with no buffer configured it still scales once nothing is free', async () => {
        const c = await saturated([peer('uuid-fixed', false, 0)], { SCALE_HEADROOM_SLOTS: '0' });
        await c.checkForRunNewInstance();
        assert.deepEqual(execFileCalls, ['/run.sh']);
    });

    it('overlapping runs cannot both trigger a replica', async () => {
        let release;
        const gate = new Promise(r => { release = r; });
        const c = await saturated([peer('uuid-fixed', false, 0)]);
        c.getFreePolicyServices = async () => { await gate; return [peer('uuid-fixed', false, 0)]; };

        const first = c.checkForRunNewInstance();
        const second = c.checkForRunNewInstance();   // must find the in-flight guard set
        release();
        await Promise.all([first, second]);
        assert.lengthOf(execFileCalls, 1, 'the 1s interval does not await, so re-entry must be guarded');
    });
});

/*
 * getFreePolicyServices only deletes the request id it is waiting on, but the reply
 * handler created a bucket for any id it saw. A reply arriving after the 500ms
 * window therefore re-created an entry that nothing ever removed - one leaked Map
 * entry per late reply, in a process that runs for weeks.
 */
describe('@unit PolicyContainer free-status reply bookkeeping', () => {
    let PolicyContainer;

    beforeEach(async () => {
        subscriptions = []; execFileCalls = [];
        ({ PolicyContainer } = await makeHarness());
    });

    const replyTo = (c, msg) =>
        c._msgs.get([c.replySubject, FREE_STATUS, c.instanceId].join('.'))(msg);

    it('drops a reply for a request it is no longer collecting', async () => {
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);
        replyTo(c, { requestId: 'stale', instanceId: 'bbb', free: true, count: 1 });
        assert.equal(c._policiInfoArrays.size, 0, 'a late reply must not resurrect a bucket');
    });

    it('collects replies for a request that is in flight, and cleans up after', async () => {
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);
        const pending = c.getFreePolicyServices();
        replyTo(c, { requestId: 'uuid-fixed', instanceId: 'bbb', free: true, count: 1 });
        const got = await pending;
        assert.lengthOf(got, 1);
        assert.equal(c._policiInfoArrays.size, 0, 'the bucket is removed once resolved');
    });

    it('resolves an array even when nothing replies', async () => {
        const c = new PolicyContainer(fakeLogger);
        await initQuiet(c);
        // Previously resolved undefined, which checkForRunNewInstance read as a
        // falsy bail-out rather than "no answers".
        assert.deepEqual(await c.getFreePolicyServices(), []);
    });
});
