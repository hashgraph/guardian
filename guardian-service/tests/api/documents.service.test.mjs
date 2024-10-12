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

const {
    ApplicationState,
    DidDocument,
    VcDocument,
    VpDocument,
} = common;
const state = new ApplicationState();
state.updateState('READY');

// const documentsAPIModule = rewire(process.cwd() + '/dist' + '/api/documents.service.js');

import { documentsAPI } from '../../dist/api/documents.service.js';

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
}

class MockNatsService {
    sendRawMessage() {
        console.log('send messages');
    }

    async getMessages() {
        return {}
    }
}
// documentsAPIModule.__set__('api_response_1', {
//     ApiResponse: function (event, cb) {
//         methods[event] = async (...args) => {
//             return cb(...args)
//         }
//     }
// })

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
    'get-did-documents': function (...args) {
    },
    'get-vc-documents': function (...args) {
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

describe('Documents Service API', function () {
    it('Get DID Documents', async function () {
        // await documentsAPIModule.documentsAPI(getMongoRepositoryMock(DidDocument), getMongoRepositoryMock(VcDocument), getMongoRepositoryMock(VpDocument));
        // const data = await methods['get-did-documents']({ did: 'test' });
        // assert.equal(data.code, 200);
        // assert.equal(typeof data.body === 'object', true);
    })

    // it('Set DID Documents', async function () {
    //     await documentsAPIModule.documentsAPI(getMongoRepositoryMock(DidDocument), getMongoRepositoryMock(VcDocument), getMongoRepositoryMock(VpDocument));
    //     const data = await methods['set-did-document']({ did: 'test' });
    //     assert.equal(data.code, 200);
    //     assert.equal(typeof data.body === 'object', true);
    // })

    // it('Set VC Documents', async function () {
    //     await documentsAPIModule.documentsAPI(getMongoRepositoryMock(DidDocument), getMongoRepositoryMock(VcDocument), getMongoRepositoryMock(VpDocument));
    //     const data = await methods['set-vc-document']({ hash: 'test' });
    //     assert.equal(data.code, 200);
    //     assert.equal(typeof data.body === 'object', true);
    // })

    // it('Set VP Documents', async function () {
    //     await documentsAPIModule.documentsAPI(getMongoRepositoryMock(DidDocument), getMongoRepositoryMock(VcDocument), getMongoRepositoryMock(VpDocument));
    //     const data = await methods['set-vp-document']();
    //     assert.equal(data.code, 200);
    //     assert.equal(typeof data.body === 'object', true);
    // })
})
