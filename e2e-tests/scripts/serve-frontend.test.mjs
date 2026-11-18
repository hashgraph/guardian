import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { startFrontendServer } from './serve-frontend.mjs';

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const freePort = async () => {
    const probe = http.createServer();
    const port = await listen(probe);
    await new Promise((resolve) => probe.close(resolve));
    return port;
};

describe('serve-frontend.mjs', () => {
    let distDir;
    let gateway;
    let gatewayPaths;
    let frontend;
    let origin;

    before(async () => {
        distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-frontend-'));
        fs.writeFileSync(path.join(distDir, 'index.html'), '<html><body>guardian app</body></html>');
        gatewayPaths = [];
        gateway = http.createServer((request, response) => {
            gatewayPaths.push(request.url);
            response.writeHead(200, { 'Content-Type': 'application/json' }).end('{"from":"gateway"}');
        });
        const gatewayPort = await listen(gateway);
        frontend = await startFrontendServer({
            distDir,
            port: await freePort(),
            angularProxy: {
                '/api/v1/': { target: `http://127.0.0.1:${gatewayPort}/`, changeOrigin: true, ws: false, pathRewrite: { '/api/v1': '' } },
            },
        });
        origin = frontend.resolvedUrls.local[0].replace(/\/$/, '');
    });

    after(async () => {
        await frontend?.close();
        gateway?.close();
        fs.rmSync(distDir, { recursive: true });
    });

    it('answers a client route with the app, so a deep link boots it', async () => {
        const response = await fetch(`${origin}/policy-viewer`);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /guardian app/);
    });

    it('forwards the API calls to the gateway without the /api/v1 prefix', async () => {
        const response = await fetch(`${origin}/api/v1/accounts/session`);
        assert.deepEqual(await response.json(), { from: 'gateway' });
        assert.deepEqual(gatewayPaths, ['/accounts/session']);
    });

    it('fails and says how to build when the build folder has no app', async () => {
        const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-frontend-empty-'));
        try {
            await assert.rejects(startFrontendServer({ distDir: emptyDir, port: await freePort(), angularProxy: {} }), /ng build --configuration production/);
        } finally {
            fs.rmSync(emptyDir, { recursive: true });
        }
    });
});
