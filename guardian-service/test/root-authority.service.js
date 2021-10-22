const { expect, assert } = require('chai');
const { rootAuthorityAPI } = require('../dist/api/root-authority.service');
const { createChannel, createTable } = require('./helper');

describe('Root Authority service', function () {
    let service, channel;

    const GET_ROOT_CONFIG = 'get-root-config';
    const SET_ROOT_CONFIG = 'set-root-config';
    const GET_ADDRESS_BOOK = 'get-address-book';

    before(async function () {
        channel = createChannel();
        const configRepository = createTable();
        const didDocumentRepository = createTable();
        const vcDocumentRepository = createTable();
        service = rootAuthorityAPI(channel,
            configRepository,
            didDocumentRepository,
            vcDocumentRepository,
        );
    });

    it('Config service init', async function () {
        assert.exists(channel.map[GET_ROOT_CONFIG]);
        assert.exists(channel.map[SET_ROOT_CONFIG]);
        assert.exists(channel.map[GET_ADDRESS_BOOK]);
    });

    it('Test GET_ROOT_CONFIG', async function () {
        assert.fail();
    });

    it('Test SET_ROOT_CONFIG', async function () {
        assert.fail();
    });

    it('Test GET_ADDRESS_BOOK', async function () {
        assert.fail();
    });
});