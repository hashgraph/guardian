import assert from 'node:assert/strict';
import esmock from 'esmock';

describe('Indexer Helia reader', function () {
    this.timeout(60000);
    let reader;
    let saved;
    const keys = ['IPFS_READER', 'IPFS_HELIA_GATEWAYS', 'IPFS_HELIA_ROUTERS', 'IPFS_HELIA_ALLOWED_PROTOCOLS', 'IPFS_HELIA_ALLOW_LOCAL_ADDRESSES'];
    const originalTimeout = AbortSignal.timeout;

    beforeEach(() => {
        saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
        keys.forEach(key => delete process.env[key]);
    });

    afterEach(() => {
        if (reader) {
            esmock.purge(reader);
            reader = undefined;
        }
        AbortSignal.timeout = originalTimeout;
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });

    async function load(factory = async () => async () => new Response('file')) {
        reader = await esmock.strict.p('../../indexer-common/dist/utils/helia-reader.js', {
            '@helia/verified-fetch': { createVerifiedFetch: factory },
        });
        return reader;
    }

    it('selects Helia only explicitly and warns once for unknown values', async () => {
        let creations = 0;
        await load(async () => { creations++; return async () => new Response('file'); });
        const warn = console.warn;
        const warnings = [];
        console.warn = message => warnings.push(message);
        try {
            for (const value of [undefined, '', 'kubo', 'helia', 'unknown', 'another']) {
                if (value === undefined) {
                    delete process.env.IPFS_READER;
                } else {
                    process.env.IPFS_READER = value;
                }
                assert.equal(reader.useHeliaReader(), value === 'helia');
            }
            assert.equal(warnings.length, 1);
            assert.match(warnings[0], /IPFS_READER.*unknown.*kubo/);
            assert.equal(creations, 0);
        } finally {
            console.warn = warn;
        }
    });

    it('disables implicit gateways and keeps secure router defaults', async () => {
        await load();
        assert.deepEqual(reader.getHeliaOptions({}), { gateways: [], allowInsecure: false, allowLocal: false });
        for (const routers of [undefined, '', '   ']) {
            assert.equal(Object.hasOwn(reader.getHeliaOptions({ IPFS_HELIA_ROUTERS: routers }), 'routers'), false);
        }
    });

    it('parses configured gateway and router lists and the explicit routing opt-out', async () => {
        await load();
        assert.deepEqual(reader.getHeliaOptions({
            IPFS_HELIA_GATEWAYS: ' https://node.example, , https://backup.example ',
            IPFS_HELIA_ROUTERS: ' https://router.example, , https://backup-router.example ',
        }), {
            gateways: ['https://node.example', 'https://backup.example'],
            routers: ['https://router.example', 'https://backup-router.example'],
            allowInsecure: false,
            allowLocal: false,
        });
        assert.deepEqual(reader.getHeliaOptions({ IPFS_HELIA_ROUTERS: ' none ' }).routers, []);
        assert.deepEqual(reader.getHeliaOptions({ IPFS_HELIA_GATEWAYS: ' , ' }).gateways, []);
    });

    it('only permits HTTP and local addresses when explicitly enabled', async () => {
        await load();
        for (const [value, allowed] of [[undefined, false], ['', false], ['https', false], ['https,http', true], [' HTTPS, HTTP ', true], ['httpx', false]]) {
            assert.equal(reader.getHeliaOptions({ IPFS_HELIA_ALLOWED_PROTOCOLS: value }).allowInsecure, allowed);
        }
        for (const value of [undefined, '', 'false', 'true', 'TRUE', '1', ' true ']) {
            assert.equal(reader.getHeliaOptions({ IPFS_HELIA_ALLOW_LOCAL_ADDRESSES: value }).allowLocal, value === 'true');
        }
    });

    it('shares one lazy factory across concurrent reads and preserves binary content', async () => {
        let creations = 0;
        const calls = [];
        const bytes = Buffer.from([0, 255, 137, 80]);
        await load(async options => {
            creations++;
            assert.deepEqual(options, { gateways: [], allowInsecure: false, allowLocal: false });
            return async (url, init) => {
                calls.push([url, init.signal]);
                return new Response(bytes);
            };
        });
        assert.equal(creations, 0);
        const results = await Promise.all([reader.readHeliaFile('first', 20000), reader.readHeliaFile('second', 60000)]);
        assert.equal(creations, 1);
        assert.deepEqual(results, [bytes, bytes]);
        assert.ok(results.every(Buffer.isBuffer));
        assert.deepEqual(calls.map(([url]) => url), ['ipfs://first', 'ipfs://second']);
        assert.ok(calls.every(([, signal]) => signal instanceof AbortSignal));
        assert.notEqual(calls[0][1], calls[1][1]);
    });

    it('retries failed initialization on the next read', async () => {
        let attempts = 0;
        const failure = new Error('initialization unavailable');
        await load(async () => {
            if (++attempts === 1) {
                throw failure;
            }
            return async () => new Response('recovered');
        });
        await assert.rejects(reader.readHeliaFile('file', 20000), error => error === failure);
        assert.deepEqual(await reader.readHeliaFile('file', 20000), Buffer.from('recovered'));
        assert.equal(attempts, 2);
    });

    it('preserves a non-OK response status for service error handling', async () => {
        await load(async () => async () => new Response('missing', { status: 404 }));
        await assert.rejects(reader.readHeliaFile('file', 20000), error => error.code === 404 && /404/.test(error.message));
    });

    it('propagates verification and body errors without a gateway fallback', async () => {
        const failure = new Error('verification failed');
        let failBody = false;
        await load(async () => async () => {
            if (!failBody) {
                throw failure;
            }
            return { ok: true, arrayBuffer: async () => { throw failure; } };
        });
        await assert.rejects(reader.readHeliaFile('file', 20000), error => error === failure);
        failBody = true;
        await assert.rejects(reader.readHeliaFile('file', 20000), error => error === failure);
    });

    for (const stage of ['initialization', 'request', 'body']) {
        it(`uses the caller deadline during ${stage}`, async () => {
            const controller = new AbortController();
            const timeouts = [];
            let started;
            let finish;
            const pending = new Promise(resolve => { finish = resolve; });
            const ready = new Promise(resolve => { started = resolve; });
            await load(async () => {
                if (stage === 'initialization') {
                    started();
                    return pending;
                }
                return async () => {
                    if (stage === 'request') {
                        started();
                        return pending;
                    }
                    return { ok: true, arrayBuffer: () => { started(); return pending; } };
                };
            });
            AbortSignal.timeout = timeout => { timeouts.push(timeout); return controller.signal; };
            const reading = reader.readHeliaFile('file', 23456);
            await ready;
            const failure = new DOMException('deadline', 'TimeoutError');
            controller.abort(failure);
            await assert.rejects(reading, error => error === failure);
            assert.deepEqual(timeouts, [23456]);
            finish(stage === 'initialization' ? async () => assert.fail('expired caller must not fetch') : stage === 'request' ? new Response('late') : new ArrayBuffer(0));
        });
    }
});
