const { expect, assert } = require('chai');
const { documentsAPI } = require('../dist/api/documents.service');
const { createChannel, createTable } = require('./helper');

describe('Documents service', function () {
    let channel;

    const GET_DID_DOCUMENTS = 'get-did-documents';
    const GET_VC_DOCUMENTS = 'get-vc-documents';
    const SET_DID_DOCUMENT = 'set-did-document';
    const SET_VC_DOCUMENT = 'set-vc-document';
    const SET_VP_DOCUMENT = 'set-vp-document';
    const GET_VP_DOCUMENTS = 'get-vp-documents';

    before(async function () {
        channel = createChannel();
        const didDocumentRepository = createTable();
        const vcDocumentRepository = createTable();
        const vpDocumentRepository = createTable();
        const vc = {
            verifyVC: async function () {
                return true;
            },
            verifySchema: async function () {
                return true;
            }
        };

        service = documentsAPI(channel,
            didDocumentRepository,
            vcDocumentRepository,
            vpDocumentRepository,
            vc
        );
    });

    it('Config service init', async function () {
        assert.exists(channel.map[GET_DID_DOCUMENTS]);
        assert.exists(channel.map[GET_VC_DOCUMENTS]);
        assert.exists(channel.map[SET_DID_DOCUMENT]);
        assert.exists(channel.map[SET_VC_DOCUMENT]);
        assert.exists(channel.map[SET_VP_DOCUMENT]);
        assert.exists(channel.map[GET_VP_DOCUMENTS]);
    });

    it('Test GET_DID_DOCUMENTS', async function () {
        let value = await channel.run(GET_DID_DOCUMENTS, { did: 'did' });
        assert.deepEqual(value, { where: { did: { $eq: 'did' } } });
    });

    it('Test GET_VC_DOCUMENTS', async function () {
        let value = await channel.run(GET_VC_DOCUMENTS, null);
        assert.equal(value, null);

        value = await channel.run(GET_VC_DOCUMENTS, {
            type: 'type',
            owner: 'owner',
            issuer: 'issuer',
            id: 'id',
            hash: 'hash',
            policyId: 'policyId',
        });
        assert.deepEqual(value, {
            'where': {
                'document.id': {
                    '$eq': 'id'
                },
                'document.issuer': {
                    '$eq': 'issuer'
                },
                'hash': {
                    '$in': 'hash'
                },
                'owner': {
                    '$eq': 'owner'
                },
                'policyId': {
                    '$eq': 'policyId'
                },
                'type': {
                    '$eq': 'type'
                }
            }
        });
    });

    it('Test SET_DID_DOCUMENT', async function () {
        let value = await channel.run(SET_DID_DOCUMENT, {
            did: 'did',
            field1: 'field1',
            field2: 'field2'
        });
        assert.deepEqual(value, {
            '_id': '1',
            'did': 'did',
            'field1': 'field1',
            'field2': 'field2'
        });

        value = await channel.run(SET_DID_DOCUMENT, {
            did: 'did',
            operation: 'operation',
            field1: 'field1',
            field2: 'field2'
        });
        assert.deepEqual(value, {
            'status': 'NEW',
            'where': {
                'did': {
                    '$eq': 'did'
                }
            }
        });

        value = await channel.run(SET_DID_DOCUMENT, {
            did: 'did',
            operation: 'create',
        });
        assert.deepEqual(value, {
            'status': 'CREATE', 'where': { 'did': { '$eq': 'did' } }
        });

        value = await channel.run(SET_DID_DOCUMENT, {
            did: 'did',
            operation: 'delete',
        });
        assert.deepEqual(value, {
            'status': 'DELETE', 'where': { 'did': { '$eq': 'did' } }
        });

        value = await channel.run(SET_DID_DOCUMENT, {
            did: 'did',
            operation: 'update',
        });
        assert.deepEqual(value, {
            'status': 'UPDATE', 'where': { 'did': { '$eq': 'did' } }
        });
    });

    it('Test SET_VC_DOCUMENT', async function () {
        let value = await channel.run(SET_VC_DOCUMENT, {
            field1: 'field1',
            field2: 'field2'
        });
        assert.deepEqual(value, {
            '_id': '1',
            field1: 'field1',
            field2: 'field2',
            signature: 1
        });

        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'operation',
            field1: 'field1',
            field2: 'field2'
        });
        assert.deepEqual(value, {
            'signature': 1,
            'status': 'NEW',
            'where': {
                'hash': {
                    '$eq': 'hash'
                }
            }
        });

        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'issue',
        });
        assert.deepEqual(value, {
            'signature': 1,
            'status': 'ISSUE',
            'where': { 'hash': { '$eq': 'hash' } }
        });


        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'revoke',
        });
        assert.deepEqual(value, {
            'signature': 1,
            'status': 'REVOKE',
            'where': { 'hash': { '$eq': 'hash' } }
        });

        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'suspend',
        });
        assert.deepEqual(value, {
            'signature': 1,
            'status': 'SUSPEND',
            'where': { 'hash': { '$eq': 'hash' } }
        });

        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'resume',
        });
        assert.deepEqual(value, {
            'signature': 1,
            'status': 'RESUME',
            'where': { 'hash': { '$eq': 'hash' } }
        });
    });

    it('Test SET_VP_DOCUMENT', async function () {
        let value = await channel.run(SET_VP_DOCUMENT, {
            field1: 'field1',
            field2: 'field2'
        });
        assert.deepEqual(value, {
            '_id': '1',
            field1: 'field1',
            field2: 'field2'
        });
    });

    it('Test GET_VP_DOCUMENTS', async function () {
        let value = await channel.run(GET_VP_DOCUMENTS, null);
        assert.equal(value, null);

        value = await channel.run(GET_VP_DOCUMENTS, {
            issuer: 'issuer',
            id: 'id',
        });
        assert.deepEqual(value, [{ issuer: 'issuer', id: 'id' }]);
    });
});