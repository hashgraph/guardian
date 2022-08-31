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
  "@hedera-modules": process.cwd() + '/dist' + "/hedera-modules/index",
  "@document-loader": process.cwd() + '/dist' + "/document-loader",
  "@database-modules": process.cwd() + '/dist' + "/database-modules"
});
const { expect, assert } = require('chai');
const rewire = require("rewire");
const { ApprovalDocument } = require("../../dist/entity/approval-document");

const { ApplicationState, MessageResponse } = require("@guardian/common");
const state = new ApplicationState();
state.updateState('READY');

const approveAPIModule = rewire("../../dist/api/approve.service");

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
    'get-approve-documents': function (...args) {
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

describe('Approve Service API', function () {
    it('Get Approve Documents', async function () {
        approveAPIModule.approveAPI(channel, getMongoRepositoryMock(ApprovalDocument));

        const data = await methods['get-approve-documents']({ id: 'test' });
        assert.equal(data.body[0] instanceof ApprovalDocument, true);

    });

    it('Update Approve Document', async function () {
        approveAPIModule.approveAPI(channel, getMongoRepositoryMock(ApprovalDocument));
        const data = await methods['update-approve-documents']({ id: 'test' });
        assert.equal(data.body instanceof ApprovalDocument, true);
    })
});
