const { expect, assert } = require('chai');
const { loaderAPI } = require('../dist/api/loader.service');
const { createChannel, createTable } = require('./helper');

describe('Loader service', function () {
    let service, channel;

    const LOAD_DID_DOCUMENT = 'load-did-document';
    const LOAD_SCHEMA_DOCUMENT = 'load-schema-document';

    before(async function () {
        channel = createChannel();
        const didDocumentLoader = {
            getDocument: async function (iri) {
                return iri;
            }
        };
        const schemaDocumentLoader = {
            getDocument: async function (iri) {
                return iri;
            }
        };
        service = loaderAPI(channel, didDocumentLoader, schemaDocumentLoader);
    });

    it('Loader service init', async function () {
        assert.exists(channel.map[LOAD_DID_DOCUMENT]);
        assert.exists(channel.map[LOAD_SCHEMA_DOCUMENT]);
    });

    it('Test LOAD_DID_DOCUMENT', async function () {
        let value = await channel.run(LOAD_DID_DOCUMENT, { did: 'did' });
        assert.equal(value, 'did');
    });

    it('Test LOAD_SCHEMA_DOCUMENT', async function () {
        let value = await channel.run(LOAD_SCHEMA_DOCUMENT, 'SchemaName');
        assert.equal(value, 'SchemaName');
    });
});