const { expect, assert } = require('chai');
const { approveAPI } = require('../dist/api/approve.service');
const { 
    createChannel, 
    createTable, 
    checkMessage, 
    checkError 
} = require('./helper');

describe('Approve service', function () {
    let service, channel, approvalDocumentRepository;

    const GET_APPROVE_DOCUMENTS = 'get-approve-documents';
    const SET_APPROVE_DOCUMENTS = 'set-approve-documents';
    const UPDATE_APPROVE_DOCUMENTS = 'update-approve-documents';

    before(async function () {
        channel = createChannel();
        approvalDocumentRepository = createTable();
        service = approveAPI(channel, approvalDocumentRepository);
    });

    it('Approve service init', async function () {
        assert.exists(channel.map[GET_APPROVE_DOCUMENTS]);
        assert.exists(channel.map[SET_APPROVE_DOCUMENTS]);
        assert.exists(channel.map[UPDATE_APPROVE_DOCUMENTS]);
    });

    it('Test GET_APPROVE_DOCUMENTS', async function () {
        let value;

        value = await channel.run(GET_APPROVE_DOCUMENTS, {
            id: 'id',
            owner: 'owner',
            approver: 'approver',
            policyId: 'policyId'
        });
        checkMessage(value, ['id']);

        value = await channel.run(GET_APPROVE_DOCUMENTS, {
            owner: 'owner',
            approver: 'approver',
            policyId: 'policyId'
        });
        checkMessage(value, {
            where: {
                owner: { '$eq': 'owner' },
                approver: { '$eq': 'approver' },
                policyId: { '$eq': 'policyId' }
            }
        });
    });

    it('Test SET_APPROVE_DOCUMENTS', async function () {
        let value;

        value = await channel.run(SET_APPROVE_DOCUMENTS, {
            id: 'id',
            field1: 'field1',
            field2: 'field2'
        });
        checkMessage(value, ['id', {
            field1: 'field1',
            field2: 'field2'
        }]);

        value = await channel.run(SET_APPROVE_DOCUMENTS, {
            field1: 'field1',
            field2: 'field2'
        });
        checkMessage(value, {
            '_id': '1',
            field1: 'field1',
            field2: 'field2'
        });
    });

    it('Test UPDATE_APPROVE_DOCUMENTS', async function () {
        let value = await channel.run(UPDATE_APPROVE_DOCUMENTS, {
            id: 'id',
            field1: 'field1',
            field2: 'field2'
        });
        checkMessage(value, ['id', {
            field1: 'field1',
            field2: 'field2'
        }]);
    });
});