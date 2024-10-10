import { expect, assert } from 'chai';
import moduleAlias from 'module-alias';
import rewire from 'rewire';
import dotenv from 'dotenv';

import * as common from '@guardian/common';

dotenv.config();

moduleAlias.addAliases({
    '@api': process.cwd() + '/dist' + '/api',
    '@entity': process.cwd() + '/dist' + '/entity',
    '@subscribers': process.cwd() + '/dist' + 'dist/subscribers',
    '@helpers': process.cwd() + '/dist' + '/helpers',
    '@auth': process.cwd() + '/dist' + '/auth',
    '@policy-engine': process.cwd() + '/dist' + '/policy-engine',
    '@hedera-modules': process.cwd() + '/dist' + '/hedera-modules/index',
    '@document-loader': process.cwd() + '/dist' + '/document-loader',
    '@analytics': process.cwd() + '/dist' + '/analytics',
    '@database-modules': process.cwd() + '/dist' + '/database-modules',
});

const { ApplicationState } = common;
const state = new ApplicationState();
state.updateState('READY');

// const profileAPIModule = rewire(process.cwd() + '/dist' + '/api/profile.service.js');


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

class MockUsers {
    async getHederaAccount() {
        return {
            hederaAccountId: process.env.OPERATOR_ID,
            hederaAccountKey: process.env.OPERATOR_KEY,
            did: 'did:hedera:testnet:Eyxtt46P5NGRoAJ1KdNaR6BP4PEbwDSDXpDncAApGpB3;hedera:testnet:fid=0.0.34052923',
        }
    }

    async getUser() {
        return { hederaAccountId: '123123' }
    }
}

class MockWallet {
    async getKey() {
        return {}
    }
}

class MockHederaSDKHelper {
    async balance() {
        return {}
    }
}

class MockDIDDocument {
}
MockDIDDocument.create = function () {
    return {
        getDid: function () { return {} }
    }
}

class MockDIDMessage {
    setDocument() { }
}

class MockMessageServer {

    setTopicObject() {
        return {
            sendMessage: function () {
                return {
                    getId: () => 'test',
                    getTopicId: () => '123',
                }
            }
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
    'GET_USER_BALANCE': function (...args) {
    },
    'CREATE_USER_PROFILE': function (...args) {
    },
    'set-did-document': function (...args) {
    },
    'set-vc-document': function (...args) {
    },
    'set-vp-document': function (...args) {
    },
    'get-vp-documents': function (...args) {
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

// profileAPIModule.__set__('common_1', {
//     Users: MockUsers,
//     Wallet: MockWallet,
//     KeyType: {
//         KEY: 'key'
//     },
//     Logger: MockLogger,
//     HederaSDKHelper: MockHederaSDKHelper,
//     DIDDocument: MockDIDDocument,
//     DIDMessage: MockDIDMessage,
//     MessageServer: MockMessageServer,
//     MessageAction: {
//         CreateDID: 'CreateDID'
//     }
// });

describe('Profile Service API', function () {
    // it('Get User Balance', async function () {
    //     await profileAPIModule.profileAPI(channel);
    //     const data = await methods['GET_USER_BALANCE']({ username: 'test' });
    //     assert.equal(data.code, 200);
    //     assert.equal(typeof data.body === 'object', true);
    // })
    //
    // it('Create User Profile', async function () {
    //     await profileAPIModule.profileAPI(channel);
    //     const data = await methods['CREATE_USER_PROFILE']({});
    //     assert.equal(data.code, 200);
    //     assert.equal(typeof data.body === 'object', true);
    // })
});
