import assert from 'node:assert/strict';
import esmock from 'esmock';
import CID from 'cids';

describe('IPFS client gateway', function () {
    this.timeout(60000);
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const bytes = Buffer.from('stored file');
    const requests = [];
    let IpfsClientClass;
    let saved;

    before(async () => {
        ({ IpfsClientClass } = await esmock('../dist/api/ipfs-client-class.js', {
            '../dist/api/helpers/utils.js': {
                axiosGetWithRetry: async (service, url, options) => {
                    requests.push({ service, url, options });
                    return { data: bytes };
                },
            },
        }));
    });

    beforeEach(() => {
        saved = Object.fromEntries(['IPFS_PUBLIC_GATEWAY', 'IPFS_PROVIDER', 'IPFS_TIMEOUT'].map((key) => [key, process.env[key]]));
        requests.length = 0;
        process.env.IPFS_TIMEOUT = '30';
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

    for (const provider of ['filebase', 'local']) {
        for (const gateway of [undefined, '']) {
            it(`reads through the own node for ${provider} when the gateway is ${gateway === undefined ? 'unset' : 'empty'}`, async () => {
                process.env.IPFS_PROVIDER = provider;
                if (gateway === undefined) {
                    delete process.env.IPFS_PUBLIC_GATEWAY;
                } else {
                    process.env.IPFS_PUBLIC_GATEWAY = gateway;
                }
                const client = new IpfsClientClass();
                assert.equal(await client.getFile(cid), bytes);
                assert.deepEqual(requests, [{
                    service: 'IPFS gateway',
                    url: `http://localhost:8080/ipfs/${cid}`,
                    options: { responseType: 'arraybuffer', timeout: 30000 },
                }]);
            });
        }
    }

    for (const template of ['https://custom.example/ipfs/{cid}', 'https://custom.example/ipfs/${cid}']) {
        it(`prefers the configured gateway ${template}`, async () => {
            process.env.IPFS_PUBLIC_GATEWAY = template;
            const client = new IpfsClientClass();
            assert.equal(await client.getFile(cid), bytes);
            assert.equal(requests.length, 1);
            assert.equal(requests[0].url, `https://custom.example/ipfs/${cid}`);
        });
    }

    it('keeps CID v0 conversion when using the fallback gateway', async () => {
        delete process.env.IPFS_PUBLIC_GATEWAY;
        const legacyCid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
        const normalized = new CID(legacyCid).toV1().toString('base32');
        const client = new IpfsClientClass();
        assert.equal(await client.getFile(legacyCid), bytes);
        assert.equal(requests.length, 1);
        assert.equal(requests[0].url, `http://localhost:8080/ipfs/${normalized}`);
    });
});
