require('module-alias/register');
const { expect, assert } = require('chai');
const rewire = require("rewire");

const { ApplicationState } = require("common");
const { Settings } = require("../../dist/entity/settings");
const { Topic } = require("../../dist/entity/topic");
const state = new ApplicationState();
state.updateState('READY');

const configAPIModule = rewire("../../dist/api/config.service");

class MockLogger {
    constructor() {
    }

    setChannel() { }
    getChannel() { }

    async info(message) {
        console.log(message)
    }

    async warn(message) {
        console.warn(message)
    }

    async error(message) {
        console.warn(message)
    }
}

configAPIModule.__set__('logger_helper_1', {
    Logger: MockLogger
});

class MockUsers {
    async getHederaAccount() {
        return {
            hederaAccountId: '0.0.1548173',
            hederaAccountKey: '302e020100300506032b657004220420e749aa65835ce90cab1cfb7f0fa11038e867e74946abca993f543cf9509c8edc',
            did: 'did:hedera:testnet:Eyxtt46P5NGRoAJ1KdNaR6BP4PEbwDSDXpDncAApGpB3;hedera:testnet:fid=0.0.34052923',
        }
    }
}

function getMongoRepositoryMock(entity) {
    const instance = new entity;

    function responseConstructor() {

        switch (entity.name) {
            default:
                return instance;
        }
    }

    return {
        find: async function (filters) {
            return [responseConstructor()]
        },
        findOne: async function (filters) {
            return responseConstructor()
        },
        create: function (entity) {
            return Object.assign(responseConstructor(), entity);
        },
        save: async function (obj) {
            return instance;
        },
        update: async function (obj) {
            return instance;
        }
    }
}

const methods = {
    'GET_TOPIC': function (...args) {
    },
    'UPDATE_SETTINGS': function (...args) {
    },
    'GET_SETTINGS': function (...args) {
    }
}

const res = {
    send: function (data) {
        assert.equal(typeof data.body === 'object', true);
    }
}

const channel = {
    response: function (event, cb) {
        methods[event] = async (...args) => {
            return cb(...args)
        }
    },
    request: function (...args) {
    }
}

describe('Config Service API', function () {
    it('Get Topic', async function () {
        await configAPIModule.configAPI(channel, getMongoRepositoryMock(Settings), getMongoRepositoryMock(Topic));
        const data = await methods['GET_TOPIC']();
        assert.equal(data.code, 200);
        assert.equal(typeof data.body === 'object', true);
    })

    it('Update Settings', async function () {
        await configAPIModule.configAPI(channel, getMongoRepositoryMock(Settings), getMongoRepositoryMock(Topic));
        const data = await methods['UPDATE_SETTINGS']({ operatorId: 'test' })
        assert.equal(data.code, 200);
        assert.equal(typeof data.body === 'object', true);
    })

    it('Get Settings', async function () {
        await configAPIModule.configAPI(channel, getMongoRepositoryMock(Settings), getMongoRepositoryMock(Topic));
        const data = await methods['GET_SETTINGS']()
        assert.equal(data.code, 200);
        assert.equal(typeof data.body === 'object', true);
    })
})
