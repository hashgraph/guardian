import { Blob } from 'node:buffer';
import { describe, before, it } from 'node:test';

import { assert } from 'chai';
import dotenv from 'dotenv';
import path from 'node:path';

import { IpfsClient } from '../dist/api/ipfs-client.js';

dotenv.config({ path: path.resolve(__dirname, `../../configs/.env.${process.env.TEST_ENV}.guardian.system`) });

/**
 * This test suite enables the testing and implementation of new IPFS clients.
 *
 * This does not require the Guardian to be built, it is all TDD based
 *
 * A software engineer may inject additional clients inside "ipfs-client.ts" and
 * use this test suite to ensure that configuration matches the expected result.
 *
 * As such, after testing one may look at the logs of the IPFS provider to ensure that
 * content was uploaded where expected
 *
 * You may use "yarn test:ipfs" to ensure that the microservice builds and runs tests.
 *
 * You can change "TEST_ENV=" field to target specific configuration from the root "configs".
 */
describe('IPFS Client implementation test suite', function () {

    let ipfsClient;

    const hello = JSON.stringify("Hello, Guardian!")

    const {
        IPFS_PROVIDER,
        IPFS_STORAGE_API_KEY,
    } = process.env

    before(async function () {
        // TODO: This will need to be updated for version 2.20.x as there is a current concept of channels.
        ipfsClient = new IpfsClient(IPFS_STORAGE_API_KEY)
    });

    it('Ensure that the IPFS provider is not local', async function () {
        assert.notEqual(IPFS_PROVIDER, 'local', 'This test script will not consider the implementation of a local IPFS node');
    });

    it('Ensure that content can be pinned and read from gateway', async function () {
        const blob = new Blob([ hello ])

        const cid = await ipfsClient.addFile(blob)

        assert.isString(cid, 'CID should be a string');

        const data = await ipfsClient.getFile(cid)

        const result = Buffer.from(data).toString()

        assert.equal(result, hello)
    });
});
