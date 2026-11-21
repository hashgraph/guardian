import assert from 'node:assert/strict';
import esmock from 'esmock';
import CID from 'cids';

describe('IPFS client reader selection', function () {
    this.timeout(60000);
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const bytes = Buffer.from([0, 0xff, 1, 0x89]);
    const keys = ['IPFS_READER', 'IPFS_TIMEOUT', 'IPFS_PUBLIC_GATEWAY', 'IPFS_HELIA_GATEWAYS', 'IPFS_HELIA_ROUTERS', 'IPFS_HELIA_ALLOWED_PROTOCOLS', 'IPFS_HELIA_ALLOW_LOCAL_ADDRESSES'];
    const gateways = [];
    const creations = [];
    const reads = [];
    let respond;
    let Client;
    let saved;
    let originalWarn;
    let originalTimeout;

    before(async () => {
        ({ IpfsClientClass: Client } = await esmock.strict.p('../dist/api/ipfs-client-class.js', {
            '../dist/api/helpers/utils.js': {
                axiosGetWithRetry: async (...args) => {
                    gateways.push(args);
                    return { data: bytes };
                },
            },
        }, {
            '@helia/verified-fetch': {
                createVerifiedFetch: async (options) => {
                    creations.push(options);
                    return async (...args) => {
                        reads.push(args);
                        return respond(...args);
                    };
                },
            },
        }));
    });

    beforeEach(() => {
        saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
        for (const key of keys) {
            delete process.env[key];
        }
        gateways.length = 0;
        reads.length = 0;
        respond = async () => new Response(bytes);
        originalWarn = console.warn;
        originalTimeout = AbortSignal.timeout;
    });

    afterEach(() => {
        console.warn = originalWarn;
        AbortSignal.timeout = originalTimeout;
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });

    for (const value of [undefined, '', 'kubo']) {
        it(`keeps the existing gateway path and avoids Helia initialization for ${JSON.stringify(value)}`, async () => {
            if (value !== undefined) {
                process.env.IPFS_READER = value;
            }
            process.env.IPFS_PUBLIC_GATEWAY = 'http://configured-node:8080/ipfs/{cid}';
            const warnings = [];
            console.warn = (...args) => warnings.push(args);
            const created = creations.length;
            assert.equal(await new Client().getFile(cid), bytes);
            assert.equal(gateways.length, 1);
            assert.equal(gateways[0][1], `http://configured-node:8080/ipfs/${cid}`);
            assert.equal(creations.length, created);
            assert.equal(reads.length, 0);
            assert.equal(warnings.length, 0);
        });
    }

    it('uses the gateway path for an unknown reader and warns only once per process', async () => {
        process.env.IPFS_READER = 'abc';
        const warnings = [];
        console.warn = (...args) => warnings.push(args);
        const created = creations.length;
        assert.equal(await new Client().getFile(cid), bytes);
        assert.equal(await new Client().getFile(cid), bytes);
        assert.equal(gateways.length, 2);
        assert.equal(warnings.length, 1);
        assert.match(String(warnings[0][0]), /IPFS_READER/);
        assert.match(String(warnings[0][0]), /abc/);
        assert.match(String(warnings[0][0]), /kubo/);
        assert.equal(creations.length, created);
    });

    it('returns unchanged binary Buffer content through Helia with normalized CIDs and a shared factory', async () => {
        process.env.IPFS_READER = 'helia';
        const legacy = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
        const normalized = new CID(legacy).toV1().toString('base32');
        const first = new Client();
        const second = new Client();
        const results = await Promise.all([first.getFile(cid), second.getFile(legacy), first.getFile(cid)]);
        assert.ok(results.every(Buffer.isBuffer));
        for (const result of results) {
            assert.deepEqual(result, bytes);
        }
        assert.equal(creations.length, 1);
        assert.equal(gateways.length, 0);
        assert.deepEqual(reads.map(([url]) => url), [`ipfs://${cid}`, `ipfs://${normalized}`, `ipfs://${cid}`]);
        assert.ok(reads.every(([, init]) => init.signal instanceof AbortSignal));
    });

    for (const [configured, expected] of [[undefined, 120000], ['30', 30000], ['0', 120000], ['invalid', 120000]]) {
        it(`uses the existing timeout calculation for ${JSON.stringify(configured)}`, async () => {
            process.env.IPFS_READER = 'helia';
            if (configured !== undefined) {
                process.env.IPFS_TIMEOUT = configured;
            }
            const timeouts = [];
            AbortSignal.timeout = (ms) => {
                timeouts.push(ms);
                return originalTimeout(ms);
            };
            await new Client().getFile(cid);
            assert.deepEqual(timeouts, [expected]);
        });
    }

    it('propagates a non-OK verified response instead of returning its error body', async () => {
        process.env.IPFS_READER = 'helia';
        respond = async () => new Response('missing', { status: 404 });
        await assert.rejects(new Client().getFile(cid), /404/);
        assert.equal(gateways.length, 0);
    });

    for (const failure of [new Error('verification failed'), new DOMException('deadline exceeded', 'TimeoutError')]) {
        it(`propagates ${failure.name} without falling back to an unverified gateway`, async () => {
            process.env.IPFS_READER = 'helia';
            respond = async () => { throw failure; };
            await assert.rejects(new Client().getFile(cid), (error) => error === failure);
            assert.equal(gateways.length, 0);
        });
    }

    it('propagates a failure while consuming the verified body', async () => {
        process.env.IPFS_READER = 'helia';
        const failure = new Error('body unavailable');
        respond = async () => ({ ok: true, arrayBuffer: async () => { throw failure; } });
        await assert.rejects(new Client().getFile(cid), (error) => error === failure);
    });

    it('expires a stalled verified body within the same request deadline', async () => {
        process.env.IPFS_READER = 'helia';
        const controller = new AbortController();
        AbortSignal.timeout = () => controller.signal;
        let started;
        const bodyStarted = new Promise((resolve) => { started = resolve; });
        respond = async () => ({
            ok: true,
            arrayBuffer: () => { started(); return new Promise(() => {}); },
        });
        const reading = new Client().getFile(cid);
        await bodyStarted;
        const failure = new DOMException('body deadline', 'TimeoutError');
        controller.abort(failure);
        await assert.rejects(reading, (error) => error === failure);
    });
});
