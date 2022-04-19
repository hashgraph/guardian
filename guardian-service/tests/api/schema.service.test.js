require('module-alias/register');
const rewire = require("rewire");

const schemaAPIModule = rewire("../../dist/api/schema.service");
const topicHelperModule = rewire("../../dist/helpers/topicHelper.js")
const { ApplicationState } = require("interfaces");
const state = new ApplicationState();
state.updateState('READY');

class MockLogger {

    constructor() {
        console.log('Mock Logger');
    }

    setChannel() {}
    getChannel() {}

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

class MockUsers {
    constructor() {
        console.log('Mock Users');
    }

    async getHederaAccount() {
        return {
            hederaAccountId: '0.0.1548173',
            hederaAccountKey: '302e020100300506032b657004220420e749aa65835ce90cab1cfb7f0fa11038e867e74946abca993f543cf9509c8edc',
            did: 'did:hedera:testnet:Eyxtt46P5NGRoAJ1KdNaR6BP4PEbwDSDXpDncAApGpB3;hedera:testnet:fid=0.0.34052923',
        }
    }
}

class TopicHelperMock {
    constructor(...args) {
        console.log('TopicHelper', args)
    }
}

function  getMongoRepositoryMock(entity) {
    console.log('name', entity.name);

    const instance = new entity;

    function responseConstructor() {

        switch (entity.name) {
            case 'Topic':
                return Object.assign(instance, {
                    topicId: "0.0.34228010",
                    name: "iRec Policy",
                    description: "iRec Policy",
                    owner: "did:hedera:testnet:9ZJXR58X9XQUgwiuxQQiTUt5yY2vX2Tw5Uph4xXsnkfM;hedera:testnet:tid=0.0.34194893",
                    type: "POLICY_TOPIC",
                    key: "302e020100300506032b657004220420abb61fea5149a3fc2ea64f851a8546f6d773fef29a0197f8300919168dbe0258",
                    policyId: "625d4f6d08f7f0692daad6a4",
                    policyUUID: "55ea39f6-4021-4c6d-8a75-dd24e1c7e0a5"
                })

            default:
                return instance;
        }
    }

    return {
        find: async function(filters) {
            return [responseConstructor()]
        },
        findOne: async function(filters) {
            return responseConstructor()
        },
        create: function(entity) {
            return Object.assign(responseConstructor(), entity);
        },
        save: async function(obj) {
            console.log(obj);
            return obj;
        }
    }
}

const methods = {
    'CREATE_SCHEMA': function (...args) {
        console.log(args);
    }
}

const res = {
    send: function(data) {
        console.log(data);
    }
}

const channel = {
    response: function(event, cb) {
        methods[event] = function() {
            cb({ payload: { document: {  } } }, res);
        }
    },
    request: function (...args) {
        console.log(args);
    }
}

const schemaRepository = {
    find: async function() {
        return ['schema']
    }
}

describe('Schema Service API', function() {
    before(async function() {
        schemaAPIModule.__set__('users_1', {
            Users: MockUsers,
        });
        schemaAPIModule.__set__('logger_helper_1', {
            Logger: MockLogger
        });
        schemaAPIModule.__set__('typeorm_1', {
            getMongoRepository: getMongoRepositoryMock
        });
        topicHelperModule.__set__('typeorm_1', {
            getMongoRepository: getMongoRepositoryMock
        });
        schemaAPIModule.__set__('topicHelper_1', topicHelperModule);
    });

    it('Create', async function() {
        schemaAPIModule.schemaAPI(channel, schemaRepository);
        methods['CREATE_SCHEMA']();
    });
})
