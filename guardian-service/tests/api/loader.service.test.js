const moduleAlias = require("module-alias");

moduleAlias.addAliases({
  "@api": process.cwd() + '/dist' + "/api",
  "@entity": process.cwd() + '/dist' + "/entity",
  "@subscribers": process.cwd() + '/dist' + "dist/subscribers",
  "@helpers": process.cwd() + '/dist' + "/helpers",
  "@auth": process.cwd() + '/dist' +  "/auth",
  "@policy-engine": process.cwd() + '/dist' +  "/policy-engine",
  "@hedera-modules": process.cwd() + '/dist' +  "/hedera-modules/index",
  "@document-loader": process.cwd() + '/dist' +  "/document-loader"
});
const { expect, assert } = require('chai');
const rewire = require("rewire");

const { ApplicationState } = require("@guardian/common");
const { DidDocument } = require("../../dist/entity/did-document");
const { Schema } = require("../../dist/entity/schema");
const state = new ApplicationState();
state.updateState('READY');

const loaderAPIModule = rewire("../../dist/api/loader.service");

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

loaderAPIModule.__set__('common_1', {
    Logger: MockLogger
});

loaderAPIModule.__set__('_hedera_modules_1', {
    DidRootKey: {
        create: function () {
            return {
                getController: function () {
                    return 'did';
                }
            }
        }
    }
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
            case 'DidDocument':
                Object.assign(instance, { document: {} });
                return instance;

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
    'load-did-document': function (...args) {
    },
    'load-schema-document': function (...args) {
    },
    'load-schema-context': function (...args) {
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

describe('Loader Service API', function () {
    it('Load DID Document', async function () {
        await loaderAPIModule.loaderAPI(channel, getMongoRepositoryMock(DidDocument), getMongoRepositoryMock(Schema));
        const data = await methods['load-did-document']({ did: 'test' });
        assert.equal(data.code, 200);
        assert.equal(typeof data.body === 'object', true);
    })

    it('Load Schema Document', async function () {
        await loaderAPIModule.loaderAPI(channel, getMongoRepositoryMock(DidDocument), getMongoRepositoryMock(Schema));
        const data = await methods['load-schema-document']({});
        assert.equal(data.code, 200);
        assert.equal(typeof data.body === 'object', true);
    })

    it('Load Schema Context', async function () {
        await loaderAPIModule.loaderAPI(channel, getMongoRepositoryMock(DidDocument), getMongoRepositoryMock(Schema));
        const data = await methods['load-schema-context']({});
        assert.equal(data.code, 200);
        assert.equal(typeof data.body === 'object', true);
    })
})
