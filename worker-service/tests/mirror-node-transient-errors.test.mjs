import assert from 'node:assert/strict';
import http from 'node:http';
import { HederaSDKHelper, NetworkOptions } from '../dist/api/helpers/hedera-sdk-helper.js';
import { Environment } from '@guardian/common/helpers/environment';

// A mirror node briefly answers 503 while it restarts or is overloaded; a list read must ride
// that out like the single-message read does, instead of failing the whole operation.
describe('Mirror node list reads during a transient outage', () => {
    const TOPIC_ID = '0.0.800';
    const ACCOUNT_ID = '0.0.7';
    const TOKEN_ID = '0.0.900';
    const unavailable = [503, { _status: { messages: [{ message: 'Service unavailable' }] } }];
    let server;
    let answers;
    let requests;
    let savedRetryDelay;

    const pageFor = (url) => {
        if (url.includes('/topics/')) {
            return {
                messages: [{
                    consensus_timestamp: '1.000000001',
                    payer_account_id: ACCOUNT_ID,
                    sequence_number: 1,
                    topic_id: TOPIC_ID,
                    message: Buffer.from('hello').toString('base64'),
                    chunk_info: { total: 1 },
                }],
                links: { next: null },
            };
        }
        return {
            tokens: [{ token_id: TOKEN_ID, balance: 5, freeze_status: 'UNFROZEN', kyc_status: 'GRANTED' }],
            links: { next: null },
        };
    };

    before(async () => {
        savedRetryDelay = process.env.REST_API_RETRY_DELAY;
        process.env.REST_API_RETRY_DELAY = '1';
        server = http.createServer((req, res) => {
            requests.push(req.url);
            const [status, body] = answers.shift() ?? [200, pageFor(req.url)];
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
        if (savedRetryDelay === undefined) {
            delete process.env.REST_API_RETRY_DELAY;
        } else {
            process.env.REST_API_RETRY_DELAY = savedRetryDelay;
        }
    });

    it('reads the topic messages once the mirror node answers again', async () => {
        answers = [unavailable];

        const messages = await HederaSDKHelper.getTopicMessages(TOPIC_ID, null, {});

        assert.deepEqual(messages.map((m) => m.message), ['hello']);
        assert.equal(requests.length, 2);
    });

    it('reads the account tokens once the mirror node answers again', async () => {
        answers = [unavailable];

        const tokens = await HederaSDKHelper.accountTokensInfo(ACCOUNT_ID);

        assert.equal(tokens[TOKEN_ID].balance, '5');
        assert.equal(requests.length, 2);
    });

    it('does not retry a topic the mirror node does not know', async () => {
        answers = [[404, { _status: { messages: [{ message: 'Not found' }] } }]];

        await assert.rejects(() => HederaSDKHelper.getTopicMessages(TOPIC_ID, null, {}), /404/);
        assert.equal(requests.length, 1);
    });
});
