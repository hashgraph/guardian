const { expect, assert } = require('chai');
const { tokenAPI } = require('../dist/api/token.service');
const { createChannel, createTable } = require('./helper');

describe('Token service', function () {
    let service, channel;

    const SET_TOKEN = 'set-token';
    const GET_TOKENS = 'get-tokens';

    before(async function () {
        channel = createChannel();
        const tokenRepository = createTable();
        service = tokenAPI(channel,
            tokenRepository,
        );
    });

    it('Config service init', async function () {
        assert.exists(channel.map[SET_TOKEN]);
        assert.exists(channel.map[GET_TOKENS]);
    });

    it('Test SET_TOKEN', async function () {
        assert.fail();
    });

    it('Test GET_TOKENS', async function () {
        assert.fail();
    });
});