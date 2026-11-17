import assert from 'node:assert/strict';
import http from 'node:http';
import { HederaSDKHelper, NetworkOptions } from '../dist/api/helpers/hedera-sdk-helper.js';
import { Environment } from '@guardian/common/helpers/environment';

// A mirror node served on a port that is not the default one, as the local Solo network does:
// a `links.next` followed without that port goes to port 80 of the same host.
describe('Mirror node pagination on a non-default port', () => {
    let server;
    let origin;
    const requests = [];

    const page = (url) => {
        const second = url.includes('page=2');
        if (url.includes('/nfts')) {
            return second
                ? { nfts: [{ token_id: '0.0.2', serial_number: 2 }], links: { next: null } }
                : { nfts: [{ token_id: '0.0.1', serial_number: 1 }], links: { next: '/api/v1/accounts/0.0.9/nfts?page=2' } };
        }
        const message = (timestamp, sequence) => ({
            consensus_timestamp: timestamp,
            payer_account_id: '0.0.9',
            sequence_number: sequence,
            topic_id: '0.0.7',
            message: Buffer.from('hello').toString('base64'),
            chunk_info: { number: 1, total: 1 },
        });
        return second
            ? { messages: [message('2.000000000', 2)], links: { next: null } }
            : { messages: [message('1.000000000', 1)], links: { next: '/api/v1/topics/0.0.7/messages?page=2' } };
    };

    before(async () => {
        server = http.createServer((req, res) => {
            requests.push(req.url);
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(page(req.url)));
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        origin = `http://127.0.0.1:${server.address().port}`;
        const options = new NetworkOptions();
        options.network = 'localnode';
        options.mirrorNodes = [origin];
        Environment.setMirrorNodes([origin]);
        Environment.setMirrorNodesBaseApi('/api/v1');
        HederaSDKHelper.setNetwork(options);
    });

    beforeEach(() => {
        requests.length = 0;
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
        Environment.setMirrorNodes([]);
        Environment.setMirrorNodesBaseApi('');
        Environment.setNetwork('testnet');
    });

    it('reads every page of the NFTs of an account', async () => {
        const nfts = await HederaSDKHelper.getSerialsNFT('0.0.9', null);

        assert.deepEqual(nfts.map((nft) => nft.serial_number), [1, 2]);
        assert.equal(requests.length, 2);
    });

    it('reads every page of the messages of a topic', async () => {
        const messages = await HederaSDKHelper.getTopicMessages('0.0.7', null, {});

        assert.deepEqual(messages.map((message) => message.sequence_number), [1, 2]);
    });

    it('returns a next-page address that keeps the port of the mirror node', async () => {
        const chunk = await HederaSDKHelper.getTopicMessageChunks('0.0.7', null, null);

        assert.equal(chunk.next, `${origin}/api/v1/topics/0.0.7/messages?page=2`);
    });
});
