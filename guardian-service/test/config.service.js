const { expect, assert } = require('chai');
const { configAPI } = require('../dist/api/config.service');
const { createChannel, createTable } = require('./helper');

describe('Config service', function () {
    let service, channel, fileContent;

    const GET_ROOT_ADDRESS_BOOK = 'get-root-address-book';

    before(async function () {
        channel = createChannel();
        fileContent = {
            'ADDRESS_BOOK' : 'ADDRESS_BOOK',
            'VC_TOPIC_ID' : 'VC_TOPIC_ID',
            'DID_TOPIC_ID' : 'DID_TOPIC_ID'
        };
        service = configAPI(channel, fileContent);
    });

    it('Config service init', async function () {
        assert.exists(channel.map[GET_ROOT_ADDRESS_BOOK]);
    });

    it('Test GET_ROOT_ADDRESS_BOOK', async function () {
        let value = await channel.run(GET_ROOT_ADDRESS_BOOK);
        assert.deepEqual(value, {
            owner: null,
            addressBook: 'ADDRESS_BOOK',
            vcTopic: 'VC_TOPIC_ID',
            didTopic: 'DID_TOPIC_ID'
        });
    });
});