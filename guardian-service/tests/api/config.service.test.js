const dotenv = require('dotenv');
dotenv.config();

const moduleAlias = require("module-alias");

moduleAlias.addAliases({
  "@api": process.cwd() + '/dist' + "/api",
  "@entity": process.cwd() + '/dist' + "/entity",
  "@subscribers": process.cwd() + '/dist' + "dist/subscribers",
  "@helpers": process.cwd() + '/dist' + "/helpers",
  "@auth": process.cwd() + '/dist' + "/auth",
  "@policy-engine": process.cwd() + '/dist' + "/policy-engine",
  "@hedera-modules": process.cwd() + '/dist' +  "/hedera-modules/index",
  "@document-loader": process.cwd() + '/dist' +  "/document-loader",
  "@database-modules": process.cwd() + '/dist' + "/database-modules"
});
const { expect, assert } = require('chai');
const rewire = require("rewire");

const { ApplicationState } = require("@guardian/common");
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

configAPIModule.__set__('common_1', {
    Logger: MockLogger
});

class MockUsers {
    async getHederaAccount() {
        return {
            hederaAccountId: process.env.OPERATOR_ID,
            hederaAccountKey: process.env.OPERATOR_KEY,
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
    // it('Get Topic', async function () {
    //     await configAPIModule.configAPI(channel, getMongoRepositoryMock(Settings), getMongoRepositoryMock(Topic));
    //     const data = await methods['GET_TOPIC']();
    //     assert.equal(data.code, 200);
    //     assert.equal(typeof data.body === 'object', true);
    // })
    //
    // it('Update Settings', async function () {
    //     await configAPIModule.configAPI(channel, getMongoRepositoryMock(Settings), getMongoRepositoryMock(Topic));
    //     const data = await methods['UPDATE_SETTINGS']({ operatorId: 'test' })
    //     assert.equal(data.code, 200);
    //     assert.equal(typeof data.body === 'object', true);
    // })
    //
    // it('Get Settings', async function () {
    //     await configAPIModule.configAPI(channel, getMongoRepositoryMock(Settings), getMongoRepositoryMock(Topic));
    //     const data = await methods['GET_SETTINGS']()
    //     assert.equal(data.code, 200);
    //     assert.equal(typeof data.body === 'object', true);
    // })
})
