import assert from 'node:assert/strict';
import esmock from 'esmock';

describe('Indexer service IPFS reader', function () {
    this.timeout(60000);
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const bytes = Buffer.from([0, 255, 137, 80]);
    let module;
    let saved;
    let respond;
    const gatewayCalls = [];
    const verifiedCalls = [];
    let creations = 0;
    const keys = ['IPFS_READER', 'IPFS_GATEWAY'];

    before(async () => {
        module = await esmock.strict.p('../dist/helpers/ipfs-service.js', {
            axios: { default: { get: async (...args) => { gatewayCalls.push(args); return { data: bytes }; } } },
        }, {
            '@helia/verified-fetch': { createVerifiedFetch: async () => {
                creations++;
                return async (...args) => { verifiedCalls.push(args); return respond(); };
            } },
        });
    });

    beforeEach(() => {
        saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
        keys.forEach(key => delete process.env[key]);
        process.env.IPFS_GATEWAY = 'http://node.example:8080/ipfs/{cid}';
        gatewayCalls.length = 0;
        verifiedCalls.length = 0;
        respond = async () => new Response(bytes);
    });

    afterEach(() => {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    });
    after(() => esmock.purge(module));

    for (const setting of [undefined, '', 'kubo', 'unknown']) {
        it(`keeps gateway reads and caller timeouts for ${JSON.stringify(setting)}`, async () => {
            if (setting !== undefined) {
                process.env.IPFS_READER = setting;
            }
            const created = creations;
            assert.equal(await module.IPFSService.get(cid, 20000), bytes);
            assert.equal(gatewayCalls.length, 1);
            assert.equal(gatewayCalls[0][0], `http://node.example:8080/ipfs/${cid}`);
            assert.equal(gatewayCalls[0][1].timeout, 20000);
            assert.equal(verifiedCalls.length, 0);
            assert.equal(creations, created);
        });
    }

    it('reads verified bytes without requiring a gateway and keeps the caller deadline', async () => {
        process.env.IPFS_READER = 'helia';
        delete process.env.IPFS_GATEWAY;
        const timeout = AbortSignal.timeout;
        const deadlines = [];
        AbortSignal.timeout = ms => { deadlines.push(ms); return timeout(ms); };
        try {
            assert.deepEqual(await module.IPFSService.get(cid, 20000), bytes);
            assert.deepEqual(deadlines, [20000]);
            assert.equal(verifiedCalls[0][0], `ipfs://${cid}`);
            assert.equal(gatewayCalls.length, 0);
        } finally {
            AbortSignal.timeout = timeout;
        }
    });

    it('wraps a verified HTTP failure as CustomError with its status', async () => {
        process.env.IPFS_READER = 'helia';
        respond = async () => new Response('missing', { status: 404 });
        await assert.rejects(module.IPFSService.get(cid, 20000), error => error.constructor.name === 'CustomError' && error.code === 404);
        assert.equal(gatewayCalls.length, 0);
    });

    for (const failure of [new Error('verification failed'), new DOMException('deadline', 'TimeoutError')]) {
        it(`keeps ${failure.name} on the existing statusless error path`, async () => {
            process.env.IPFS_READER = 'helia';
            respond = async () => { throw failure; };
            await assert.rejects(module.IPFSService.get(cid, 20000), error => error.constructor.name === 'CustomError' && error.code === undefined && error.message.includes(failure.message));
            assert.equal(gatewayCalls.length, 0);
        });
    }
});
