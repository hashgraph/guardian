const { expect, assert } = require('chai');
const { tokenAPI } = require('../dist/api/token.service');
const { 
    createChannel, 
    createTable, 
    checkMessage, 
    checkError 
} = require('./helper');

describe('Token service', function () {
    let service, channel;

    const SET_TOKEN = 'set-token';
    const GET_TOKENS = 'get-tokens';

    const tokens = [];

    before(async function () {
        channel = createChannel();
        const tokenRepository = createTable();
        tokenRepository.create = function (items) {
            return items = Object.assign({ _id: '1' }, items, true);
        };
        tokenRepository.save = async function (items) {
            tokens.push(items);
        }
        tokenRepository.find = async function (param) {
            if (!param) {
                return tokens;
            }
            return param;
        }
        service = tokenAPI(channel,
            tokenRepository,
        );
    });

    it('Config service init', async function () {
        assert.exists(channel.map[SET_TOKEN]);
        assert.exists(channel.map[GET_TOKENS]);
    });

    it('Test SET_TOKEN', async function () {
        let value = await channel.run(SET_TOKEN, {
            tokenId: 'tokenId',
            tokenName: 'tokenName',
            tokenSymbol: 'tokenSymbol',
            tokenType: 'tokenType',
            decimals: 'decimals',
            initialSupply: 'initialSupply',
            adminId: 'adminId',
            adminKey: 'adminKey',
            kycKey: 'kycKey',
            freezeKey: 'freezeKey',
            wipeKey: 'wipeKey',
            supplyKey: 'supplyKey'
        });
        checkMessage(value, [{
            _id: '1',
            tokenId: 'tokenId',
            tokenName: 'tokenName',
            tokenSymbol: 'tokenSymbol',
            tokenType: 'tokenType',
            decimals: 'decimals',
            initialSupply: 'initialSupply',
            adminId: 'adminId',
            adminKey: 'adminKey',
            kycKey: 'kycKey',
            freezeKey: 'freezeKey',
            wipeKey: 'wipeKey',
            supplyKey: 'supplyKey'
        }]);
    });

    it('Test GET_TOKENS', async function () {
        let value = await channel.run(GET_TOKENS, null);
        checkMessage(value, [{
            _id: '1',
            tokenId: 'tokenId',
            tokenName: 'tokenName',
            tokenSymbol: 'tokenSymbol',
            tokenType: 'tokenType',
            decimals: 'decimals',
            initialSupply: 'initialSupply',
            adminId: 'adminId',
            adminKey: 'adminKey',
            kycKey: 'kycKey',
            freezeKey: 'freezeKey',
            wipeKey: 'wipeKey',
            supplyKey: 'supplyKey'
        }]);

        value = await channel.run(GET_TOKENS, { tokenId: 'tokenId' });
        checkMessage(value, { where: { tokenId: { '$eq': 'tokenId' } } });
    });
});