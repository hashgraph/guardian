import assert from 'node:assert/strict';
import http from 'node:http';
import { HederaSDKHelper, NetworkOptions } from '../dist/api/helpers/hedera-sdk-helper.js';
import { Environment } from '@guardian/common/helpers/environment';

// The mirror node lags behind consensus: a token created moments ago answers 404 until the
// mirror node has ingested it, and a caller that reads it right after creating it must wait.
describe('Token info of a token the mirror node is still ingesting', () => {
    const TOKEN_ID = '0.0.900';
    let server;
    let answers;
    let requests;

    before(async () => {
        server = http.createServer((req, res) => {
            requests.push(req.url);
            const [status, body] = answers.shift() ?? [200, { token_id: TOKEN_ID, symbol: 'T' }];
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
        Environment.setMirrorNodes([]);
        Environment.setMirrorNodesBaseApi('');
        Environment.setNetwork('testnet');
    });

    it('waits until the mirror node has indexed the token', async function () {
        this.timeout(10000);
        answers = [[404, { _status: { messages: [{ message: 'Not found' }] } }]];

        const info = await HederaSDKHelper.getTokenInfo(TOKEN_ID, {});

        assert.equal(info.token_id, TOKEN_ID);
        assert.equal(requests.length, 2);
    });

    it('does not wait on an error that indexing cannot resolve', async () => {
        answers = [[503, { _status: { messages: [{ message: 'Service unavailable' }] } }]];

        await assert.rejects(() => HederaSDKHelper.getTokenInfo(TOKEN_ID, {}), /503/);
        assert.equal(requests.length, 1);
    });
});
