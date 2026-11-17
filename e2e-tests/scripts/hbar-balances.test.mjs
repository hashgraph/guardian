import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { snapshotHbarBalances } = require('../cypress/tasks/hbarBalances.js');

// A gateway whose login works and whose balance endpoint answers with balanceBody, or never when it is undefined.
function startGateway(balanceBody) {
    const server = http.createServer((request, response) => {
        const reply = (body) => response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
        if (request.url === '/accounts/login/') return reply({ refreshToken: 'refresh' });
        if (request.url === '/accounts/access-token/') return reply({ accessToken: 'access' });
        if (request.url === '/accounts/balance' && balanceBody !== undefined) return reply(balanceBody);
        // Otherwise leave the request hanging, as a gateway does when a backend service is missing.
    });
    return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

describe('snapshotHbarBalances', () => {
    let server;
    let warnings;
    beforeEach((t) => {
        warnings = [];
        t.mock.method(console, 'warn', (message) => warnings.push(message));
        t.mock.method(console, 'log', () => {});
    });
    afterEach(() => {
        server.closeAllConnections();
        server.close();
    });

    const configFor = (port) => ({ env: { apiServer: `http://127.0.0.1:${port}`, SRUser: 'StandardRegistry', Password: 'test' } });

    it('reads the balance of every configured account', async () => {
        server = await startGateway({ balance: '42.5 ℏ' });
        const balances = await snapshotHbarBalances(configFor(server.address().port));
        assert.deepEqual([...balances], [['StandardRegistry', 42.5]]);
    });

    it('gives up on a request that does not answer, and says which one', async () => {
        server = await startGateway(undefined);
        const started = Date.now();
        const balances = await snapshotHbarBalances(configFor(server.address().port), { requestTimeoutMs: 200 });
        assert.ok(Date.now() - started < 5000);
        assert.equal(balances.size, 0);
        assert.equal(warnings.length, 1);
        assert.match(warnings[0], /StandardRegistry.*accounts\/balance did not answer within 0\.2 s/);
    });

    it('says so when the gateway returns no balance', async () => {
        server = await startGateway(null);
        const balances = await snapshotHbarBalances(configFor(server.address().port));
        assert.equal(balances.size, 0);
        assert.deepEqual(warnings, ['[HBAR balance] StandardRegistry: accounts/balance returned no balance']);
    });
});
