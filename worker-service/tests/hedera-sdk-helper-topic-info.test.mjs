import assert from 'node:assert/strict';
import axios from 'axios';
import { HederaSDKHelper } from '../dist/api/helpers/hedera-sdk-helper.js';
import { Environment } from '@guardian/common';

/*
 * The home instance trusts any DID document on a Standard Registry topic that has a
 * submit key, so the topic info must report the submit key from the mirror node.
 */
describe('HederaSDKHelper.topicInfo', () => {
    const realGet = axios.get;
    let requested;

    afterEach(() => {
        axios.get = realGet;
    });

    function mirror(data) {
        requested = [];
        axios.get = async (url) => {
            requested.push(url);
            return { data };
        };
    }

    it('returns the submit key of a closed topic', async () => {
        mirror({ topic_id: '0.0.7', submit_key: { _type: 'ED25519', key: 'abc' } });

        const info = await HederaSDKHelper.topicInfo('0.0.7');

        assert.deepEqual(info, { topicId: '0.0.7', submitKey: 'abc' });
        assert.deepEqual(requested, [`${Environment.HEDERA_TOPIC_API}/0.0.7`]);
    });

    it('returns no submit key for an open topic', async () => {
        mirror({ topic_id: '0.0.7', submit_key: null });

        assert.deepEqual(await HederaSDKHelper.topicInfo('0.0.7'), { topicId: '0.0.7', submitKey: null });
    });

    it('rejects an invalid topic id without calling the mirror node', async () => {
        mirror({});

        await assert.rejects(() => HederaSDKHelper.topicInfo('not-a-topic'), /Invalid topic/);
        assert.equal(requested.length, 0);
    });
});
