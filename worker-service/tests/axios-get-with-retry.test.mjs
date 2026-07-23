import assert from 'node:assert/strict';
import http from 'node:http';
import { axiosGetWithRetry } from '../dist/api/helpers/utils.js';

const startServer = (handler) => new Promise((resolve) => {
    const state = { hits: 0 };
    const server = http.createServer((req, res) => {
        state.hits++;
        handler(req, res, state.hits);
    });
    server.listen(0, '127.0.0.1', () => {
        state.url = `http://127.0.0.1:${server.address().port}/`;
        state.close = () => new Promise((done) => server.close(done));
        resolve(state);
    });
});

const json = (res, code, body, headers = {}) => {
    res.writeHead(code, { 'content-type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
};

describe('axiosGetWithRetry', () => {
    it('retries a 429 and returns the eventual success', async () => {
        const server = await startServer((req, res, hits) => {
            if (hits === 1) {
                json(res, 429, { error: 'rate limited' });
            } else {
                json(res, 200, { ok: true });
            }
        });

        const res = await axiosGetWithRetry('Mirror node', server.url, {}, { attempts: 3, delay: 10 });
        assert.equal(res.data.ok, true);
        assert.equal(server.hits, 2, 'a throttled request must be retried');
        await server.close();
    });

    it('waits for Retry-After instead of its own backoff', async function () {
        this.timeout(5000);
        const server = await startServer((req, res, hits) => {
            if (hits === 1) {
                json(res, 429, { error: 'rate limited' }, { 'retry-after': '1' });
            } else {
                json(res, 200, { ok: true });
            }
        });

        const started = Date.now();
        await axiosGetWithRetry('Mirror node', server.url, {}, { attempts: 2, delay: 10 });
        const elapsed = Date.now() - started;
        assert.ok(elapsed >= 900, `Retry-After: 1 should hold the retry ~1s, waited ${elapsed}ms`);
        await server.close();
    });

    it('does not retry a 404', async () => {
        const server = await startServer((req, res) => json(res, 404, { error: 'not found' }));

        await assert.rejects(
            () => axiosGetWithRetry('Mirror node', server.url, {}, { attempts: 3, delay: 10 }),
            /Mirror node request failed/
        );
        assert.equal(server.hits, 1, '404 must fail fast');
        await server.close();
    });

    it('gives up after the configured number of attempts', async () => {
        const server = await startServer((req, res) => json(res, 429, { error: 'rate limited' }));

        await assert.rejects(
            () => axiosGetWithRetry('IPFS gateway', server.url, {}, { attempts: 2, delay: 10 }),
            /IPFS gateway request failed/
        );
        assert.equal(server.hits, 2);
        await server.close();
    });
});
