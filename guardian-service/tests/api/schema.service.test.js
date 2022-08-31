const dotenv = require('dotenv');
dotenv.config();

const moduleAlias = require("module-alias");
moduleAlias.addAliases({
  "@api": process.cwd() + '/dist' + "/api",
  "@entity": process.cwd() + '/dist' +  "/entity",
  "@subscribers": process.cwd() + '/dist' +  "dist/subscribers",
  "@helpers": process.cwd() + '/dist' +  "/helpers",
  "@auth": process.cwd() + '/dist' +  "/auth",
  "@policy-engine": process.cwd() + '/dist' +  "/policy-engine",
  "@hedera-modules": process.cwd() + '/dist' +  "/hedera-modules/index",
  "@document-loader": process.cwd() + '/dist' +  "/document-loader",
  "@database-modules": process.cwd() + '/dist' + "/database-modules"
});
const rewire = require("rewire");

const schemaAPIModule = rewire("../../dist/api/schema.service");
const { ApplicationState } = require("@guardian/common");
const state = new ApplicationState();
state.updateState('READY');

class MockLogger {

    constructor() {
        console.log('Mock Logger');
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

class MockUsers {
    constructor() {
        console.log('Mock Users');
    }

    async getHederaAccount() {
        return {
            hederaAccountId: process.env.OPERATOR_ID,
            hederaAccountKey: process.env.OPERATOR_KEY,
            did: 'did:hedera:testnet:Eyxtt46P5NGRoAJ1KdNaR6BP4PEbwDSDXpDncAApGpB3;hedera:testnet:fid=0.0.34052923',
        }
    }
}

function getMongoRepositoryMock(entity) {
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

const channel = {
    response: function (event, cb) {
        methods[event] = async (...args) => {
            return cb(...args)
        }
    },
    request: function (...args) {
        console.log(args);
    }
}

const schemaRepository = {
    find: async function () {
        return ['schema']
    }
}

describe('Schema Service API', function () {
    before(async function () {
        schemaAPIModule.__set__('users_1', {
            Users: MockUsers,
        });
        schemaAPIModule.__set__('common_1', {
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

    // it('Create', async function() {
    //     schemaAPIModule.schemaAPI(channel, schemaRepository);
    //     methods['CREATE_SCHEMA']();
    // });
})
