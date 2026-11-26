import assert from 'node:assert/strict';
import esmock from 'esmock';
import { getHeliaOptions } from '../dist/api/helpers/helia-reader.js';

describe('Helia reader options', () => {
    it('explicitly disables gateway defaults and keeps secure settings', () => {
        assert.deepEqual(getHeliaOptions({}), {
            gateways: [],
            allowInsecure: false,
            allowLocal: false,
        });
    });

    it('trims gateway URLs and drops empty list items', () => {
        assert.deepEqual(getHeliaOptions({
            IPFS_HELIA_GATEWAYS: ' https://node.example, , https://backup.example/ ',
        }).gateways, ['https://node.example', 'https://backup.example/']);
        assert.deepEqual(getHeliaOptions({ IPFS_HELIA_GATEWAYS: ' , ' }).gateways, []);
    });

    for (const value of [undefined, '', '   ']) {
        it(`leaves router defaults to Helia for ${JSON.stringify(value)}`, () => {
            const options = getHeliaOptions({ IPFS_HELIA_ROUTERS: value });
            assert.equal(Object.hasOwn(options, 'routers'), false);
        });
    }

    it('turns routing services off only when configured with none', () => {
        assert.deepEqual(getHeliaOptions({ IPFS_HELIA_ROUTERS: ' none ' }).routers, []);
    });

    it('passes a trimmed configured router list', () => {
        assert.deepEqual(getHeliaOptions({
            IPFS_HELIA_ROUTERS: ' https://router.example, , https://backup-router.example ',
        }).routers, ['https://router.example', 'https://backup-router.example']);
    });

    for (const [value, expected] of [[undefined, false], ['', false], ['https', false], ['https,http', true], [' HTTPS, HTTP ', true], ['https,httpx', false]]) {
        it(`allows insecure HTTP for protocol list ${JSON.stringify(value)} only when explicitly included`, () => {
            assert.equal(getHeliaOptions({ IPFS_HELIA_ALLOWED_PROTOCOLS: value }).allowInsecure, expected);
        });
    }

    for (const value of [undefined, '', 'false', 'true', 'TRUE', '1', ' true ']) {
        it(`allows local addresses only for the exact true string: ${JSON.stringify(value)}`, () => {
            assert.equal(getHeliaOptions({ IPFS_HELIA_ALLOW_LOCAL_ADDRESSES: value }).allowLocal, value === 'true');
        });
    }
});

describe('Helia reader lifetime', function () {
    this.timeout(60000);
    const keys = ['IPFS_TIMEOUT', 'IPFS_HELIA_GATEWAYS', 'IPFS_HELIA_ROUTERS', 'IPFS_HELIA_ALLOWED_PROTOCOLS', 'IPFS_HELIA_ALLOW_LOCAL_ADDRESSES'];
    let saved;
    let module;

    beforeEach(() => {
        saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
        for (const key of keys) {
            delete process.env[key];
        }
    });

    afterEach(() => {
        if (module) {
            esmock.purge(module);
            module = undefined;
        }
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });

    it('reuses one initialized reader for concurrent reads and forwards empty gateways explicitly', async () => {
        const creations = [];
        const requests = [];
        module = await esmock.strict.p('../dist/api/helpers/helia-reader.js', {
            '@helia/verified-fetch': {
                createVerifiedFetch: async (options) => {
                    creations.push(options);
                    await Promise.resolve();
                    return async (url, init) => {
                        requests.push({ url, init });
                        return new Response('file');
                    };
                },
            },
        });
        const files = await Promise.all([module.readHeliaFile('first'), module.readHeliaFile('second')]);
        assert.equal(creations.length, 1);
        assert.deepEqual(creations[0], { gateways: [], allowInsecure: false, allowLocal: false });
        assert.deepEqual(files, [Buffer.from('file'), Buffer.from('file')]);
        assert.deepEqual(requests.map(({ url }) => url), ['ipfs://first', 'ipfs://second']);
        assert.notEqual(requests[0].init.signal, requests[1].init.signal);
    });

    it('allows a later read to retry initialization after a factory failure', async () => {
        let attempts = 0;
        const failure = new Error('initialization unavailable');
        module = await esmock.strict.p('../dist/api/helpers/helia-reader.js', {
            '@helia/verified-fetch': {
                createVerifiedFetch: async () => {
                    if (++attempts === 1) {
                        throw failure;
                    }
                    return async () => new Response('recovered');
                },
            },
        });
        await assert.rejects(module.readHeliaFile('file'), (error) => error === failure);
        assert.deepEqual(await module.readHeliaFile('file'), Buffer.from('recovered'));
        assert.equal(attempts, 2);
    });

    it('expires a caller while shared initialization is still pending', async () => {
        const controller = new AbortController();
        const timeout = AbortSignal.timeout;
        let started;
        const initializationStarted = new Promise((resolve) => { started = resolve; });
        let finish;
        const initialization = new Promise((resolve) => { finish = resolve; });
        let reads = 0;
        module = await esmock.strict.p('../dist/api/helpers/helia-reader.js', {
            '@helia/verified-fetch': {
                createVerifiedFetch: () => { started(); return initialization; },
            },
        });
        AbortSignal.timeout = () => controller.signal;
        try {
            const reading = module.readHeliaFile('file');
            await initializationStarted;
            const failure = new DOMException('initialization deadline', 'TimeoutError');
            controller.abort(failure);
            await assert.rejects(reading, (error) => error === failure);
            finish(async () => { reads++; return new Response('too late'); });
            await initialization;
            await Promise.resolve();
            assert.equal(reads, 0);
        } finally {
            AbortSignal.timeout = timeout;
        }
    });
});
