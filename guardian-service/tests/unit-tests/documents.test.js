const moduleAlias = require('module-alias');

moduleAlias.addAliases({
  "@api": process.cwd() + '/dist' + "/api",
  "@entity": process.cwd() + '/dist' + "/entity",
  "@subscribers": process.cwd() + '/dist' + "dist/subscribers",
  "@helpers": process.cwd() + '/dist' + "/helpers",
  "@auth": process.cwd() + '/dist' + "/auth",
  "@policy-engine": process.cwd() + '/dist' + "/policy-engine",
  "@hedera-modules": process.cwd() + '/dist' + "/hedera-modules/index",
  "@document-loader": process.cwd() + '/dist' + "/document-loader"
});
const { expect, assert } = require('chai');
const { documentsAPI } = require('../../dist/api/documents.service');
const {
    createChannel,
    createTable,
    checkMessage,
    checkError
} = require('./helper');
const { ApplicationState, ApplicationStates } = require('@guardian/interfaces');

describe('Documents service', function () {
    let channel;

    const GET_DID_DOCUMENTS = 'get-did-documents';
    const GET_VC_DOCUMENTS = 'get-vc-documents';
    const SET_DID_DOCUMENT = 'set-did-document';
    const SET_VC_DOCUMENT = 'set-vc-document';
    const SET_VP_DOCUMENT = 'set-vp-document';
    const GET_VP_DOCUMENTS = 'get-vp-documents';

    before(async function () {
        const state = new ApplicationState();
        state.updateState(ApplicationStates.READY);

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
        checkMessage(value, { where: { did: { $eq: 'did' } } });
    });

    it('Test GET_VC_DOCUMENTS', async function () {
        let value = await channel.run(GET_VC_DOCUMENTS, null);
        checkMessage(value, null);

        value = await channel.run(GET_VC_DOCUMENTS, {
            owner: 'owner',
            issuer: 'issuer',
            id: 'id',
            hash: 'hash',
            policyId: 'policyId',
        });
        checkMessage(value, {
            'where': {
                'document.id': {
                    '$eq': 'id'
                },
                'document.issuer': {
                    '$eq': 'issuer'
                },
                'hash': {
                    '$eq': 'hash'
                },
                'owner': {
                    '$eq': 'owner'
                },
                'policyId': {
                    '$eq': 'policyId'
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
        checkMessage(value, {
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
        checkMessage(value, {
            'status': 'NEW',
            'did': 'did'
        });

        value = await channel.run(SET_DID_DOCUMENT, {
            did: 'did',
            operation: 'CREATE',
        });
        checkMessage(value, {
            'status': 'CREATE', 'did': 'did'
        });

        value = await channel.run(SET_DID_DOCUMENT, {
            did: 'did',
            operation: 'DELETE',
        });
        checkMessage(value, {
            'status': 'DELETE', 'did': 'did'
        });

        value = await channel.run(SET_DID_DOCUMENT, {
            did: 'did',
            operation: 'UPDATE',
        });
        checkMessage(value, {
            'status': 'UPDATE', 'did': 'did'
        });
    });

    it('Test SET_VC_DOCUMENT', async function () {
        let value = await channel.run(SET_VC_DOCUMENT, {
            document: {
                field1: 'field1',
                field2: 'field2'
            }
        });
        checkMessage(value, {
            '_id': '1',
            document: {
                field1: 'field1',
                field2: 'field2'
            },
            signature: 2
        }, 'Set 1');

        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'operation',
            document: {
                field1: 'field1',
                field2: 'field2'
            }
        });
        checkMessage(value, {
            'signature': 2,
            'hederaStatus': 'NEW',
            'hash': 'hash'
        }, 'Set 2');

        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'ISSUE',
        });
        checkMessage(value, {
            'signature': 2,
            'hederaStatus': 'ISSUE',
            'hash': 'hash'
        }, 'Set 3');


        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'REVOKE',
        });
        checkMessage(value, {
            'signature': 2,
            'hederaStatus': 'REVOKE',
            'hash': 'hash'
        }, 'Set 4');

        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'SUSPEND',
        });
        checkMessage(value, {
            'signature': 2,
            'hederaStatus': 'SUSPEND',
            'hash': 'hash'
        }, 'Set 5');

        value = await channel.run(SET_VC_DOCUMENT, {
            hash: 'hash',
            operation: 'RESUME',
        });
        checkMessage(value, {
            'signature': 2,
            'hederaStatus': 'RESUME',
            'hash': 'hash'
        }, 'Set 6');
    });

    it('Test SET_VP_DOCUMENT', async function () {
        let value = await channel.run(SET_VP_DOCUMENT, {
            document: {
                field1: 'field1',
                field2: 'field2'
            }
        });
        checkMessage(value, {
            '_id': '1',
            document: {
                field1: 'field1',
                field2: 'field2'
            }
        });
    });

    it('Test GET_VP_DOCUMENTS', async function () {
        let value = await channel.run(GET_VP_DOCUMENTS, null);
        checkMessage(value, null);

        value = await channel.run(GET_VP_DOCUMENTS, {
            issuer: 'issuer',
            id: 'id',
        });
        checkMessage(value, { issuer: 'issuer', id: 'id' });
    });
});
