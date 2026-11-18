import assert from 'node:assert/strict';
import http from 'node:http';
import { HederaSDKHelper, NetworkOptions } from '../dist/api/helpers/hedera-sdk-helper.js';
import { Environment } from '@guardian/common/helpers/environment';

// A message submitted moments ago answers 404 until the mirror node has ingested it (dry-running a
// policy reads the topic message its import has just written). A read waits a few seconds for it.
describe('Topic message the mirror node is still ingesting', () => {
    const TOPIC_ID = '0.0.901';
    const TIMESTAMP = '1795011385.514645643';
    const NOT_FOUND = [404, { _status: { messages: [{ message: 'Not found' }] } }];
    const indexedMessage = {
        consensus_timestamp: TIMESTAMP,
        payer_account_id: '0.0.2',
        sequence_number: 1,
        topic_id: TOPIC_ID,
        message: Buffer.from('{"type":"Topic"}').toString('base64'),
    };
    let server;
    let answers;
    let requests;

    before(async () => {
        server = http.createServer((req, res) => {
            requests.push(req.url);
            const [status, body] = (typeof answers === 'function' ? answers() : answers.shift()) ?? [200, indexedMessage];
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

    it('waits until the mirror node has indexed a message read by its timestamp', async function () {
        this.timeout(10000);
        answers = [NOT_FOUND, NOT_FOUND];

        const message = await HederaSDKHelper.getTopicMessage(TIMESTAMP, {});

        assert.equal(message.message, '{"type":"Topic"}');
        assert.equal(requests.length, 3);
    });

    it('waits until the mirror node has indexed a message read by its index in the topic', async function () {
        this.timeout(10000);
        answers = [NOT_FOUND];

        const message = await HederaSDKHelper.getTopicMessageByIndex(TOPIC_ID, 1, {});

        assert.equal(message.topicId, TOPIC_ID);
        assert.equal(requests.length, 2);
    });

    it('gives up after a few seconds when the message never shows up', async function () {
        this.timeout(15000);
        answers = () => NOT_FOUND;
        const started = Date.now();

        await assert.rejects(() => HederaSDKHelper.getTopicMessageByIndex(TOPIC_ID, 1, {}), /404/);

        const waited = Date.now() - started;
        assert.ok(waited >= 4000 && waited <= 6500, `waited ${waited} ms`);
    });

    it('does not wait on an error that indexing cannot resolve', async () => {
        answers = [[400, { _status: { messages: [{ message: 'Invalid parameter' }] } }]];

        await assert.rejects(() => HederaSDKHelper.getTopicMessage(TIMESTAMP, {}), /400/);
        assert.equal(requests.length, 1);
    });
});
