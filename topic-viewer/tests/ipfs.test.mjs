import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';
import express from 'express';
import { getIpfsFile } from '../dist/ipfs.js';

describe('Topic viewer IPFS route', () => {
    const cid = 'bafybeiavprz5ld3ktizv4gsqos3dg7nbexcrhvtswzvoatgmea5ncvr3di';
    const request = globalThis.fetch;
    let server;
    let origin;
    let savedGateway;

    before(async () => {
        const app = express();
        app.get('/ipfs/:cid', getIpfsFile);
        server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        origin = `http://127.0.0.1:${server.address().port}`;
    });

    after(async () => {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    });

    beforeEach(() => {
        savedGateway = process.env.IPFS_PUBLIC_GATEWAY;
        delete process.env.IPFS_PUBLIC_GATEWAY;
    });

    afterEach(() => {
        mock.restoreAll();
        if (savedGateway === undefined) {
            delete process.env.IPFS_PUBLIC_GATEWAY;
        } else {
            process.env.IPFS_PUBLIC_GATEWAY = savedGateway;
        }
    });

    for (const configured of [undefined, '']) {
        it(`returns exact file bytes from the own node when ENV is ${configured === undefined ? 'unset' : 'empty'}`, async () => {
            if (configured !== undefined) {
                process.env.IPFS_PUBLIC_GATEWAY = configured;
            }
            const bytes = new Uint8Array([0, 0xff, 0x89, 0x50, 0x4e, 0x47]);
            const upstream = mock.method(globalThis, 'fetch', async () => new Response(bytes));
            const result = await request(`${origin}/ipfs/${cid}`);
            assert.equal(result.status, 200);
            assert.equal(result.headers.get('content-type'), 'application/octet-stream');
            assert.deepEqual(new Uint8Array(await result.arrayBuffer()), bytes);
            assert.equal(upstream.mock.callCount(), 1);
            const [url, options] = upstream.mock.calls[0].arguments;
            assert.equal(url, `http://localhost:8080/ipfs/${cid}`);
            assert.ok(options.signal instanceof AbortSignal);
        });
    }

    for (const template of ['http://ipfs-node:8080/ipfs/{cid}', 'http://private-node:8080/ipfs/${cid}']) {
        it(`prefers the configured gateway ${template}`, async () => {
            process.env.IPFS_PUBLIC_GATEWAY = template;
            const upstream = mock.method(globalThis, 'fetch', async () => new Response('{"ok":true}'));
            const result = await request(`${origin}/ipfs/${cid}`);
            assert.equal(result.status, 200);
            assert.deepEqual(await result.json(), { ok: true });
            assert.equal(upstream.mock.calls[0].arguments[0], template.replace('${cid}', cid).replace('{cid}', cid));
        });
    }

    it('keeps decoded route input in one upstream path segment', async () => {
        const value = `${cid}?format=car`;
        const upstream = mock.method(globalThis, 'fetch', async () => new Response('file'));
        const result = await request(`${origin}/ipfs/${encodeURIComponent(value)}`);
        assert.equal(result.status, 200);
        await result.text();
        assert.equal(upstream.mock.calls[0].arguments[0], `http://localhost:8080/ipfs/${encodeURIComponent(value)}`);
    });

    it('preserves an upstream miss as a non-200 response', async () => {
        mock.method(globalThis, 'fetch', async () => new Response('missing', { status: 404 }));
        const result = await request(`${origin}/ipfs/${cid}`);
        assert.equal(result.status, 404);
        await result.text();
    });

    for (const error of [new Error('node unavailable'), new DOMException('deadline', 'TimeoutError')]) {
        it(`returns a non-200 response for ${error.message}`, async () => {
            mock.method(globalThis, 'fetch', async () => { throw error; });
            const result = await request(`${origin}/ipfs/${cid}`);
            assert.equal(result.status, 502);
            await result.text();
        });
    }

    it('returns a non-200 response when reading the upstream body fails', async () => {
        mock.method(globalThis, 'fetch', async () => ({
            status: 200,
            arrayBuffer: async () => { throw new Error('connection closed'); },
        }));
        const result = await request(`${origin}/ipfs/${cid}`);
        assert.equal(result.status, 502);
        await result.text();
    });
});
