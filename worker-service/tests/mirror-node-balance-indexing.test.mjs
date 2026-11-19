import assert from 'node:assert/strict';
import http from 'node:http';
import { HederaSDKHelper, NetworkOptions } from '../dist/api/helpers/hedera-sdk-helper.js';
import { Environment } from '@guardian/common/helpers/environment';

// The balance of an account created moments ago comes back as an empty list until the mirror
// node has ingested the account; callers validate accounts they have just created.
describe('Balance of an account the mirror node is still ingesting', () => {
    const ACCOUNT_ID = '0.0.902';
    const NOT_INDEXED = [200, { balances: [] }];
    const INDEXING_TIMEOUT = 300;
    let server;
    let answers;
    let requests;
    let savedEnvironment;

    before(async () => {
        savedEnvironment = { ...process.env };
        process.env.MIRROR_NODE_INDEXING_TIMEOUT = String(INDEXING_TIMEOUT);
        process.env.MIRROR_NODE_INDEXING_POLL_INTERVAL = '20';
        server = http.createServer((req, res) => {
            requests.push(req.url);
            const [status, body] = (typeof answers === 'function' ? answers() : answers.shift())
                ?? [200, { balances: [{ account: ACCOUNT_ID, balance: 500000000 }] }];
            res.writeHead(status, { 'content-type': 'application/json' });
            res.end(JSON.stringify(body));
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const origin = `http://127.0.0.1:${server.address().port}`;
        const options = new NetworkOptions();
        options.network = 'localnode';
        options.mirrorNodes = [origin];
        Environment.setMirrorNodes([origin]);
        Environment.setMirrorNodesBaseApi('/api/v1');
        HederaSDKHelper.setNetwork(options);
    });

    beforeEach(() => {
        requests = [];
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
        process.env = savedEnvironment;
        Environment.setMirrorNodes([]);
        Environment.setMirrorNodesBaseApi('');
        Environment.setNetwork('testnet');
    });

    it('waits until the mirror node reports a balance for the account', async () => {
        answers = [NOT_INDEXED, NOT_INDEXED];

        const balance = await HederaSDKHelper.balance(ACCOUNT_ID);

        assert.equal(balance, '5 ℏ');
        assert.equal(requests.length, 3);
    });

    it('gives up once the indexing timeout is over when the account never shows up', async () => {
        answers = () => NOT_INDEXED;

        await assert.rejects(() => HederaSDKHelper.balance(ACCOUNT_ID), new RegExp(`Invalid balance '${ACCOUNT_ID}'`));
    });
});
