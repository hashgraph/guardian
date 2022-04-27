require('module-alias/register');
const { expect, assert } = require('chai');
const rewire = require("rewire");
const { ApprovalDocument } = require("../../dist/entity/approval-document");

const { ApplicationState } = require("interfaces");
const state = new ApplicationState();
state.updateState('READY');

const approveAPIModule = rewire("../../dist/api/approve.service");

class MockLogger {
    constructor() {
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
            return instance;
        }
    }
}

const methods = {
    'get-approve-documents': function (...args) {
    }
}

const res = {
    send: function(data) {
        assert.equal(data.body[0] instanceof ApprovalDocument, true);
    }
}

const channel = {
    response: function(event, cb) {
        methods[event] = function() {
            cb({ payload: { document: {  } } }, res);
        }
    },
    request: function (...args) {
    }
}

describe('Approve Service API', function() {
    it('Get Approve Documents', async function() {
        approveAPIModule.approveAPI(channel, getMongoRepositoryMock(ApprovalDocument));
        methods['get-approve-documents']();
    });

    it('Update Approve Document', async function() {
        approveAPIModule.approveAPI(channel, getMongoRepositoryMock(ApprovalDocument));
        methods['update-approve-documents']();
    })
});
