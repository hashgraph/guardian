import 'reflect-metadata';
import assert from 'node:assert/strict';
import {
    makeUser, makeLogger, internalExceptionRethrow, loadController, guardiansInterfaces, FakeEntityOwner
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/policy.js';

let stub;

class FakePolicyEngine {
    savePolicyDocumentation(...a) { return stub.savePolicyDocumentation(...a); }
}

const anyClass = new Proxy({}, { get: (_t, p) => (p === 'then' ? undefined : class {}) });

async function load() {
    return loadController(DIST, {
        '#helpers': new Proxy({
            CacheService: class {},
            getCacheKey: (t) => `k:${t.join('|')}`,
            InternalException: internalExceptionRethrow,
            PolicyEngine: FakePolicyEngine,
            EntityOwner: FakeEntityOwner,
            UseCache: () => () => undefined,
            ONLY_SR: '',
        }, { get: (t, p) => (p in t ? t[p] : class {}) }),
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#constants': new Proxy({ PREFIXES: {}, CACHE: {} }, { get: (t, p) => (p in t ? t[p] : {}) }),
        '#middlewares': anyClass,
        '@guardian/common/helpers/pino-logger': { PinoLogger: class {} },
        '@guardian/interfaces': guardiansInterfaces,
    });
}

describe('PolicyApi.updatePolicyDocumentation', function () {
    this.timeout(60000);
    let PolicyApi;
    before(async () => { ({ PolicyApi } = await load()); });

    it('sends only the entries to the engine, for the authenticated owner', async () => {
        const calls = [];
        stub = { savePolicyDocumentation: async (...a) => { calls.push(a); return { id: 'p1', policyDocumentation: a[1] }; } };
        const api = new PolicyApi({ invalidate: async () => undefined }, makeLogger());
        const user = makeUser();
        const entries = [{ alias: 'create', target: 't', method: 'POST' }];

        const result = await api.updatePolicyDocumentation(user, 'p1', { entries });

        assert.equal(calls.length, 1);
        assert.equal(calls[0][0], 'p1');
        assert.deepEqual(calls[0][1], entries);
        assert.equal(calls[0][2].user, user);
        assert.deepEqual(result.policyDocumentation, entries);
    });

    it('propagates the engine error', async () => {
        stub = { savePolicyDocumentation: async () => { throw new Error('Policy documentation cannot be changed for this policy.'); } };
        const api = new PolicyApi({ invalidate: async () => undefined }, makeLogger());
        await assert.rejects(
            api.updatePolicyDocumentation(makeUser(), 'p1', { entries: [] }),
            /cannot be changed/
        );
    });
});
