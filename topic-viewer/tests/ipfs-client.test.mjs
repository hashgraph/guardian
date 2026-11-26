import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it, mock } from 'node:test';
import { runInNewContext } from 'node:vm';

describe('Topic viewer IPFS page reader', () => {
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const source = readFileSync(new URL('../public/script.js', import.meta.url), 'utf8');
    const reader = (fetch) => runInNewContext(`${source}\ngetIPFS;`, {
        fetch,
        document: { addEventListener() {} },
    });

    it('loads JSON through a relative route that resolves beneath the proxy prefix', async () => {
        const value = { type: 'document', name: 'File' };
        const fetch = mock.fn(async () => ({ status: 200, json: async () => value }));
        assert.equal(await reader(fetch)(cid), value);
        assert.equal(fetch.mock.callCount(), 1);
        const url = fetch.mock.calls[0].arguments[0];
        assert.equal(url, `ipfs/${cid}`);
        assert.equal(new URL(url, 'http://guardian/topic-viewer/').pathname, `/topic-viewer/ipfs/${cid}`);
        assert.equal(new URL(url, 'http://localhost:3006/').pathname, `/ipfs/${cid}`);
    });

    it('keeps the no-content result for a failed route response', async () => {
        const json = mock.fn();
        const fetch = async () => ({ status: 502, json });
        assert.equal(await reader(fetch)(cid), null);
        assert.equal(json.mock.callCount(), 0);
    });

    it('keeps the no-content result for a network error', async () => {
        assert.equal(await reader(async () => { throw new Error('offline'); })(cid), null);
    });

    it('keeps the no-content result for a file that is not JSON', async () => {
        const fetch = async () => ({ status: 200, json: async () => { throw new SyntaxError('invalid JSON'); } });
        assert.equal(await reader(fetch)(cid), null);
    });
});
