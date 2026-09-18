import assert from 'node:assert/strict';
import esmock from 'esmock';

/*
 * A policy could be started twice and end up hosted by two pods: checkIfPolicyAlive is
 * a short ping, and a policy needs tens of seconds from fork to answering it, so a
 * second caller in that window sent its own GENERATE_POLICY and a different pod took
 * it. Every start path funnels through generateModel, so the guard belongs there.
 */

let PolicyEngine;

async function loadEngine() {
    return esmock(
        '../../dist/policy-engine/policy-engine.js',
        {
            '@guardian/common': {
                DatabaseServer: { async getPolicyById() { return { id: 'p1', ownerId: 'owner' }; } },
            },
            '../../dist/helpers/guardians.js': {
                GuardiansService: class {
                    constructor() {}
                    async checkIfPolicyAlive() { return false; }
                    sendPolicyMessage() {}
                },
            },
        },
    );
}

function makeEngine(sent) {
    const engine = Object.create(PolicyEngine.prototype);
    engine.policyReadyCallbacks = new Map();
    engine.policyInitializationErrors = new Map();
    engine.inFlightStarts = new Map();
    engine.sendMessageWithTimeout = async (_event, _timeout, payload) => {
        sent.push(payload.policyId);
        return { confirmed: true, free: 1 };
    };
    return engine;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

describe('@unit PolicyEngine.generateModel start dedupe', () => {
    before(async function () {
        this.timeout(120000);
        ({ PolicyEngine } = await loadEngine());
    });

    it('collapses concurrent starts of the same policy into ONE GENERATE_POLICY', async () => {
        const sent = [];
        const engine = makeEngine(sent);

        const first = engine.generateModel('p1', false);
        const second = engine.generateModel('p1', false);
        await settle();

        assert.deepEqual(sent, ['p1'], 'a second caller must not issue its own GENERATE_POLICY');

        const cb = engine.policyReadyCallbacks.get('p1');
        assert.ok(cb, 'the single start should be parked on POLICY_READY');
        cb({ ok: true }, null);

        assert.deepEqual(await first, { ok: true });
        assert.deepEqual(await second, { ok: true }, 'both callers share the one start');
    });

    it('does not dedupe different policies against each other', async () => {
        const sent = [];
        const engine = makeEngine(sent);

        const a = engine.generateModel('p1', false);
        const b = engine.generateModel('p2', false);
        await settle();

        assert.deepEqual(sent.sort(), ['p1', 'p2']);
        engine.policyReadyCallbacks.get('p1')({ p: 1 }, null);
        engine.policyReadyCallbacks.get('p2')({ p: 2 }, null);
        assert.deepEqual(await a, { p: 1 });
        assert.deepEqual(await b, { p: 2 });
    });

    it('releases the guard once the start settles, so a later start is allowed', async () => {
        const sent = [];
        const engine = makeEngine(sent);

        const first = engine.generateModel('p1', false);
        await settle();
        engine.policyReadyCallbacks.get('p1')({ ok: 1 }, null);
        await first;

        const second = engine.generateModel('p1', false);
        await settle();
        assert.deepEqual(sent, ['p1', 'p1'], 'the guard must not be a permanent cache');
        engine.policyReadyCallbacks.get('p1')({ ok: 2 }, null);
        assert.deepEqual(await second, { ok: 2 });
    });

    it('releases the guard when the start FAILS, so the next attempt retries', async () => {
        const sent = [];
        const engine = makeEngine(sent);

        const first = engine.generateModel('p1', false);
        await settle();
        engine.policyReadyCallbacks.get('p1')(null, 'schema error');
        await assert.rejects(first, /schema error/);

        const second = engine.generateModel('p1', false);
        await settle();
        assert.deepEqual(sent, ['p1', 'p1'], 'a failed start must not wedge the guard shut');
        engine.policyReadyCallbacks.get('p1')({ ok: true }, null);
        await second;
    });

    it('a start that never settles is released, so a later caller can retry', async () => {
        // startModel's confirmed branch waits on POLICY_READY with no timeout, and that
        // event never arrives when policy-service gives up after maxRestartAttempts or
        // the policy is destroyed mid-start. An unbounded entry would leave the policy
        // unstartable for the lifetime of the process.
        const sent = [];
        const engine = makeEngine(sent);
        const realTimeout = PolicyEngine.START_TIMEOUT_MS;
        PolicyEngine.START_TIMEOUT_MS = 30;
        engine.startModel = () => new Promise(() => { });   // never settles

        try {
            await assert.rejects(engine.generateModel('p1', false), /did not start within/);
        } finally {
            PolicyEngine.START_TIMEOUT_MS = realTimeout;
        }

        assert.equal(engine.inFlightStarts.has('p1'), false,
            'the dead attempt must not be handed to the next caller');
    });

    it('destroying a policy drops a start still in flight', async () => {
        const engine = makeEngine([]);
        engine.startModel = () => new Promise(() => { });
        engine.generateModel('p1', false).catch(() => { });

        assert.equal(engine.inFlightStarts.has('p1'), true, 'precondition');
        await engine.destroyModel('p1', 'owner');

        assert.equal(engine.inFlightStarts.has('p1'), false,
            'the child exits with code 0 and no ready event follows');
    });

    it('a caller joining an in-flight start receives its failure too', async () => {
        const sent = [];
        const engine = makeEngine(sent);

        const first = engine.generateModel('p1', false);
        const second = engine.generateModel('p1', false);
        await settle();
        engine.policyReadyCallbacks.get('p1')(null, 'boom');

        await assert.rejects(first, /boom/);
        await assert.rejects(second, /boom/, 'the joined caller must not resolve as success');
    });
});
