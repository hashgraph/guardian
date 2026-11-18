import assert from 'node:assert/strict';
import sinon from 'sinon';
import { PolicyEngineEvents } from '@guardian/interfaces';
import { GuardiansService } from '../../dist/helpers/guardians.js';
import { PolicyEngineService } from '../../dist/policy-engine/policy-engine.service.js';
import { PolicyComponentsUtils } from '../../dist/policy-engine/policy-components-utils.js';
import { DatabaseServer, silentLogger } from '../_handler-harness.mjs';

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

describe('external data delivery', function () {
    this.timeout(60000);
    const handlers = new Map();
    const logger = silentLogger();
    const callbacks = {};
    let send;
    let lookupId;
    let lookupTag;

    before(() => {
        for (const name of ['BlockUpdateFn', 'BlockErrorFn', 'UpdateUserInfoFn', 'ExternalEventFn']) {
            callbacks[name] = PolicyComponentsUtils[name];
        }
        const service = Object.create(PolicyEngineService.prototype);
        service.channel = { getMessages: (event, cb) => handlers.set(event, cb), sendMessage: () => {} };
        service.policyEngine = {};
        service.registerListeners(logger);
    });

    beforeEach(() => {
        lookupId = sinon.stub(DatabaseServer, 'getPolicyById').resolves({ id: 'policy' });
        lookupTag = sinon.stub(DatabaseServer, 'getPolicyByTag').resolves({ id: 'policy' });
        send = sinon.stub(new GuardiansService(), 'sendPolicyMessage').resolves({});
    });

    afterEach(() => sinon.restore());
    after(() => Object.assign(PolicyComponentsUtils, callbacks));

    for (const event of [PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM]) {
        const run = (flags = {}) => handlers.get(event)({
            data: { policyTag: 'policy-tag', document: {} }, policyId: 'policy', blockTag: 'external', ...flags,
        });

        describe(event, () => {
            it('returns 404 for a missing policy in strict mode', async () => {
                lookupId.resolves(null);
                lookupTag.resolves(null);
                const result = await run({ strict: true });
                assert.equal(result.code, 404);
                assert.equal(result.error, 'Policy not found');
            });

            it('returns 503 when the policy cannot receive the document', async () => {
                send.resolves(null);
                const result = await run({ strict: true });
                assert.equal(result.code, 503);
                assert.equal(result.error, 'Policy is not running');
            });

            it('returns 504 with the timeout text when delivery is not confirmed', async () => {
                send.rejects(Object.assign(new Error('Timeout for policy'), { code: 'REQUEST_TIMEOUT' }));
                const result = await run({ strict: true });
                assert.equal(result.code, 504);
                assert.equal(result.error, 'Timeout for policy');
            });

            it('distinguishes an actual sender timeout from an unavailable policy', async () => {
                send.restore();
                const service = new GuardiansService();
                const request = sinon.stub(service, 'requestOrThrow');
                request.rejects(Object.assign(new Error('Timeout for policy'), { code: 'REQUEST_TIMEOUT' }));
                const timedOut = await run({ strict: true });
                assert.equal(timedOut.code, 504);
                assert.equal(timedOut.error, 'Timeout for policy');
                service.setPolicyHooks(null);
                request.rejects(Object.assign(new Error('No responders'), { code: 'NO_RESPONDERS' }));
                const unavailable = await run({ strict: true });
                assert.equal(unavailable.code, 503);
                assert.equal(unavailable.error, 'Policy is not running');
            });

            for (const [code, message] of [[404, 'Block not found'], [422, 'marker must be ok'], [503, 'Policy is discontinued and could not be started']]) {
                it(`keeps the ${code} error and text returned by processing`, async () => {
                    send.rejects(Object.assign(new Error(message), { code }));
                    const result = await run({ strict: true });
                    assert.equal(result.code, code);
                    assert.equal(result.error, message);
                });
            }

            it('returns 500 for an unexpected processing error', async () => {
                send.rejects(new Error('Unexpected failure'));
                const result = await run({ strict: true });
                assert.equal(result.code, 500);
                assert.equal(result.error, 'Unexpected failure');
            });

            it('passes the retry outcome to the gateway', async () => {
                send.resolves({ retrying: true });
                assert.deepEqual((await run({ strict: true })).body, { retrying: true });
            });

            it('waits for the first attempt before confirming strict success', async () => {
                const entered = deferred();
                const completion = deferred();
                send.callsFake(async () => { entered.resolve(); return completion.promise; });
                let settled = false;
                const response = run({ strict: true }).then((result) => { settled = true; return result; });
                await entered.promise;
                await new Promise(setImmediate);
                assert.equal(settled, false);
                completion.resolve({});
                const result = await response;
                assert.equal(result.code, 200);
                assert.equal(result.body, true);
            });

            for (const flags of [{}, { strict: false }, { syncEvents: true }, { strict: true, syncEvents: true }]) {
                it(`keeps immediate success for legacy flags ${JSON.stringify(flags)}`, async () => {
                    const completion = deferred();
                    send.returns(completion.promise);
                    try {
                        const result = await run(flags);
                        assert.equal(result.code, 200);
                        assert.equal(result.body, true);
                    } finally {
                        completion.resolve({});
                    }
                });

                it(`logs an asynchronous failure and keeps success for flags ${JSON.stringify(flags)}`, async () => {
                    const failure = new Error('Delivery failed');
                    const logged = sinon.spy(logger, 'error');
                    send.rejects(failure);
                    assert.equal((await run(flags)).body, true);
                    await new Promise(setImmediate);
                    assert.equal(logged.calledWith(failure), true);
                });
            }

            it('keeps legacy success when the policy does not exist', async () => {
                lookupId.resolves(null);
                lookupTag.resolves(null);
                assert.equal((await run()).body, true);
                assert.equal((await run({ strict: false })).body, true);
                assert.equal((await run({ strict: true, syncEvents: true })).body, true);
            });

            if (event === PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM) {
                it('does not add a policy lookup to the legacy custom route', async () => {
                    lookupId.rejects(new Error('Unexpected lookup'));
                    assert.equal((await run()).body, true);
                    assert.equal((await run({ strict: true, syncEvents: true })).body, true);
                });
            }
        });
    }
});

describe('policy message timeout reporting', () => {
    const service = new GuardiansService();
    beforeEach(() => service.setPolicyHooks(null));
    afterEach(() => { sinon.restore(); service.setPolicyHooks(null); });

    it('reports a timeout only when explicitly requested', async () => {
        const failure = Object.assign(new Error('Timeout for policy'), { code: 'REQUEST_TIMEOUT' });
        sinon.stub(service, 'requestOrThrow').rejects(failure);
        await assert.rejects(service.sendPolicyMessage('event', 'policy', {}, 100000, true), (error) => error === failure);
        assert.equal(await service.sendPolicyMessage('event', 'policy', {}), null);
        assert.equal(await service.sendPolicyMessage('event', 'policy', {}, 100000, false), null);
    });

    it('still returns null when no policy responder can be started', async () => {
        sinon.stub(service, 'requestOrThrow').rejects(Object.assign(new Error('No responders'), { code: 'NO_RESPONDERS' }));
        assert.equal(await service.sendPolicyMessage('event', 'policy', {}, 100000, true), null);
    });

    it('keeps on-demand startup in strict timeout mode', async () => {
        const request = sinon.stub(service, 'requestOrThrow');
        request.onFirstCall().rejects(Object.assign(new Error('No responders'), { code: 'NO_RESPONDERS' }));
        request.onSecondCall().resolves({ received: true });
        service.setPolicyHooks({ ensureRunning: async () => true });
        assert.deepEqual(await service.sendPolicyMessage('event', 'policy', {}, 100000, true), { received: true });
    });
});
