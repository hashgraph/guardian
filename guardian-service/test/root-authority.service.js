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
        configRepository.findOne = async function (param) {
            if (param &&
                param.where &&
                param.where.did &&
                param.where.did['$eq'] == 'did'
            ) {
                return {
                    hederaAccountId: 'hederaAccountId',
                    hederaAccountKey: 'hederaAccountKey',
                    addressBook: 'addressBook',
                    didTopic: 'didTopic',
                    vcTopic: 'vcTopic',
                    appnetName: 'appnetName',
                    didServerUrl: 'didServerUrl',
                    didTopicMemo: 'didTopicMemo',
                    vcTopicMemo: 'vcTopicMemo',
                    did: 'did',
                    state: 0
                }
            }
            return null;
        };
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
        let value = await channel.run(GET_ROOT_CONFIG, null);
        assert.equal(value, null);

        value = await channel.run(GET_ROOT_CONFIG, 'did');
        assert.deepEqual(value, {
            appnetName: 'appnetName',
            hederaAccountId: 'hederaAccountId',
            hederaAccountKey: 'hederaAccountKey',
            addressBook: 'addressBook',
            vcTopic: 'vcTopic',
            didTopic: 'didTopic',
            didServerUrl: 'didServerUrl',
            didTopicMemo: 'didTopicMemo',
            vcTopicMemo: 'vcTopicMemo',
            did: 'did',
            didDocument: {
                where: {
                    did: { '$eq': 'did' }
                }
            },
            vcDocument: {
                where: {
                    owner: { '$eq': 'did' },
                    type: { '$eq': 'ROOT_AUTHORITY' }
                }
            }
        });
    });

    it('Test SET_ROOT_CONFIG', async function () {
        let value = await channel.run(SET_ROOT_CONFIG, {
            hederaAccountId: 'hederaAccountId',
            hederaAccountKey: 'hederaAccountKey',
            addressBook: 'addressBook',
            didTopic: 'didTopic',
            vcTopic: 'vcTopic',
            appnetName: 'appnetName',
            didServerUrl: 'didServerUrl',
            didTopicMemo: 'didTopicMemo',
            vcTopicMemo: 'vcTopicMemo',
            did: 'did',
            state: 0
        });
        assert.deepEqual(value, {
            '_id': '1',
            hederaAccountId: 'hederaAccountId',
            hederaAccountKey: 'hederaAccountKey',
            addressBook: 'addressBook',
            didTopic: 'didTopic',
            vcTopic: 'vcTopic',
            appnetName: 'appnetName',
            didServerUrl: 'didServerUrl',
            didTopicMemo: 'didTopicMemo',
            vcTopicMemo: 'vcTopicMemo',
            did: 'did',
            state: 0
        });
    });

    it('Test GET_ADDRESS_BOOK', async function () {
        let value = await channel.run(GET_ADDRESS_BOOK, null);
        assert.equal(value, null);
        value = await channel.run(GET_ADDRESS_BOOK, { owner: 'did' });
        assert.deepEqual(value, {
            owner: 'did',
            addressBook: 'addressBook',
            vcTopic: 'vcTopic',
            didTopic: 'didTopic'
        });
    });
});