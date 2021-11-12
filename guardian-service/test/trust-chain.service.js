const { expect, assert } = require('chai');
const { trustChainAPI } = require('../dist/api/trust-chain.service');
const { createChannel, createTable } = require('./helper');

describe('Trust Chain service', function () {
    let service, channel;

    const GET_CHAIN = 'get-chain';

    before(async function () {
        channel = createChannel();
        const didDocumentRepository = createTable();
        const vcDocumentRepository = createTable();
        const vpDocumentRepository = createTable();
        // vcDocumentRepository.find
        // vcDocumentRepository.findOne
        // didDocumentRepository.find
        // vpDocumentRepository.findOne
        service = trustChainAPI(channel,
            didDocumentRepository,
            vcDocumentRepository,
            vpDocumentRepository,
        );
    });

    it('Config service init', async function () {
        assert.exists(channel.map[GET_CHAIN]);
    });

    it('Test GET_CHAIN', async function () {
        // assert.fail();
    });
});

