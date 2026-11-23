import assert from 'node:assert/strict';
import esmock from 'esmock';
import CID from 'cids';

describe('Indexer worker IPFS reader', function () {
    this.timeout(60000);
    const legacyCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    const cid = new CID(legacyCid).toV1().toString('base32');
    const bytes = Buffer.from([0, 255, 137, 80]);
    let module;
    let saved;
    let respond;
    let checkResponse;
    let creations = 0;
    const requests = [];
    const reads = [];
    const keys = ['IPFS_READER', 'IPFS_GATEWAY', 'IPFS_CHECK_GATEWAY'];
    let warn;
    let error;
    let log;

    before(async () => {
        module = await esmock.strict.p('../dist/loaders/ipfs-service.js', {}, {
            axios: { default: { get: async (url, options) => {
                requests.push([url, options]);
                return { data: url.startsWith('http://check.example/') ? Buffer.from(JSON.stringify(checkResponse)) : bytes };
            } } },
            '@helia/verified-fetch': { createVerifiedFetch: async () => {
                creations++;
                return async (...args) => { reads.push(args); return respond(); };
            } },
        });
    });

    beforeEach(() => {
        saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
        keys.forEach(key => delete process.env[key]);
        process.env.IPFS_GATEWAY = 'http://node.example/ipfs/{cid}';
        process.env.IPFS_CHECK_GATEWAY = 'http://check.example/providers/{cid}';
        requests.length = 0;
        reads.length = 0;
        respond = async () => new Response(bytes);
        checkResponse = [{ id: 'provider' }];
        warn = console.warn;
        error = console.error;
        log = console.log;
        console.log = () => undefined;
    });

    afterEach(async () => {
        await module.IPFSService.node?.stop();
        console.warn = warn;
        console.error = error;
        console.log = log;
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });
    after(() => esmock.purge(module));

    for (const setting of [undefined, '', 'kubo']) {
        it(`keeps the gateway reader for ${JSON.stringify(setting)}`, async () => {
            if (setting !== undefined) {
                process.env.IPFS_READER = setting;
            }
            const created = creations;
            await module.IPFSService.init();
            assert.deepEqual(await module.IPFSService.node.get(legacyCid, 12345), bytes);
            assert.equal(requests[0][0], `http://node.example/ipfs/${cid}`);
            assert.equal(requests[0][1].timeout, 12345);
            assert.equal(reads.length, 0);
            assert.equal(creations, created);
        });
    }

    it('warns once for unknown readers and retains gateway reads', async () => {
        process.env.IPFS_READER = 'unknown';
        const warnings = [];
        console.warn = message => warnings.push(message);
        await module.IPFSService.init();
        await module.IPFSService.init();
        assert.deepEqual(await module.IPFSService.node.get(cid), bytes);
        assert.equal(warnings.length, 1);
        assert.match(warnings[0], /IPFS_READER.*unknown.*kubo/);
        assert.equal(reads.length, 0);
    });

    it('does not require a file gateway when Helia is selected and initializes lazily', async () => {
        process.env.IPFS_READER = 'helia';
        delete process.env.IPFS_GATEWAY;
        const errors = [];
        console.error = message => errors.push(message);
        const created = creations;
        await module.IPFSService.init();
        assert.equal(creations, created);
        assert.deepEqual(errors, []);
        assert.deepEqual(await module.IPFSService.node.get(legacyCid), bytes);
        assert.equal(reads[0][0], `ipfs://${cid}`);
        assert.equal(requests.length, 0);
    });

    it('uses the current default and explicit read timeouts with Helia', async () => {
        process.env.IPFS_READER = 'helia';
        await module.IPFSService.init();
        const timeout = AbortSignal.timeout;
        const deadlines = [];
        AbortSignal.timeout = ms => { deadlines.push(ms); return timeout(ms); };
        try {
            await module.IPFSService.node.get(cid);
            await module.IPFSService.node.get(cid, 23456);
            assert.deepEqual(deadlines, [60000, 23456]);
        } finally {
            AbortSignal.timeout = timeout;
        }
    });

    it('keeps the availability endpoint, normalized CID and check timeout with Helia', async () => {
        process.env.IPFS_READER = 'helia';
        await module.IPFSService.init();
        assert.deepEqual(await module.IPFSService.node.check(legacyCid), { check: true });
        assert.equal(requests[0][0], `http://check.example/providers/${cid}`);
        assert.equal(requests[0][1].timeout, 15000);
        assert.equal(reads.length, 0);
        checkResponse = [];
        assert.deepEqual(await module.IPFSService.node.check(cid, 4321), { check: false, error: 'file does not exist' });
        assert.equal(requests[1][1].timeout, 4321);
    });

    it('keeps a missing availability endpoint as an inconclusive check', async () => {
        process.env.IPFS_READER = 'helia';
        delete process.env.IPFS_CHECK_GATEWAY;
        const errors = [];
        console.error = message => errors.push(message);
        await module.IPFSService.init();
        assert.deepEqual(errors, ['IPFS_CHECK_GATEWAY not configured']);
        assert.deepEqual(await module.IPFSService.node.check(cid), { check: undefined, error: 'IPFS_CHECK_GATEWAY not configured' });
        assert.equal(requests.length, 0);
    });

    it('propagates verified read failures without a gateway fallback', async () => {
        process.env.IPFS_READER = 'helia';
        await module.IPFSService.init();
        respond = async () => new Response('missing', { status: 404 });
        await assert.rejects(module.IPFSService.node.get(cid), error => error.code === 404);
        assert.equal(requests.length, 0);
    });

    it('does not fetch a file rejected by the existing availability check', async () => {
        process.env.IPFS_READER = 'helia';
        await module.IPFSService.init();
        checkResponse = [];
        const setTimeout = globalThis.setTimeout;
        const deadlines = [];
        globalThis.setTimeout = (_callback, ms) => { deadlines.push(ms); return 0; };
        try {
            assert.equal(await module.IPFSService.getFile(cid), undefined);
            assert.deepEqual(deadlines, [300000]);
            assert.equal(requests.length, 1);
            assert.equal(reads.length, 0);
        } finally {
            globalThis.setTimeout = setTimeout;
        }
    });

    it('returns undefined from the file loader on a verified failure', async () => {
        process.env.IPFS_READER = 'helia';
        await module.IPFSService.init();
        respond = async () => { throw new Error('verification failed'); };
        const setTimeout = globalThis.setTimeout;
        globalThis.setTimeout = () => 0;
        try {
            assert.equal(await module.IPFSService.getFile(cid), undefined);
            assert.equal(reads.length, 1);
            assert.equal(requests.length, 1);
        } finally {
            globalThis.setTimeout = setTimeout;
        }
    });
});
