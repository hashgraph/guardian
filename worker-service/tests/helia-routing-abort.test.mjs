import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { delegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client';
import { defaultLogger } from '@libp2p/logger';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const clientRequire = createRequire(import.meta.resolve('@helia/delegated-routing-v1-http-api-client'));
const { CID } = await import(pathToFileURL(clientRequire.resolve('multiformats/cid')).href);

describe('Helia routing lookup timeout', () => {
    let server;
    let client;
    const rejections = [];
    const onRejection = (reason) => rejections.push(reason);

    beforeEach(async () => {
        rejections.length = 0;
        process.prependListener('unhandledRejection', onRejection);
        server = http.createServer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
            res.flushHeaders();
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        client = delegatedRoutingV1HttpApiClient({
            url: `http://127.0.0.1:${server.address().port}`,
            timeout: 200,
            cacheTTL: 0,
        })({ logger: defaultLogger() });
        await client.start?.();
    });

    afterEach(async () => {
        process.removeListener('unhandledRejection', onRejection);
        await client.stop?.();
        server.closeAllConnections();
        server.close();
    });

    const cid = CID.parse('bafkreifjjcie6lypi6ny7amxnfftagclbuxndqonfipmb64f2km2devei4');
    const lookups = [
        ['getProviders', true],
        ['getPeers', false],
        ['getClosestPeers', false],
    ];

    for (const [method, rejects] of lookups) {
        it(`ends a stalled ${method} stream without an unhandled rejection`, async () => {
            const records = [];
            const lookup = async () => {
                for await (const record of client[method](cid)) {
                    records.push(record);
                }
            };
            if (rejects) {
                await assert.rejects(lookup);
            } else {
                await lookup();
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            assert.deepEqual(records, []);
            assert.deepEqual(rejections.map(String), []);
        });
    }
});
