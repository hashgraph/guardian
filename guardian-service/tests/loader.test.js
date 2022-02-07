const { expect, assert } = require('chai');
const { loaderAPI } = require('../dist/api/loader.service');

const { DIDDocumentLoader } = require('../dist/document-loader/did-document-loader');
const { ContextDocumentLoader } = require('../dist/document-loader/context-loader');
const { VCSchemaLoader } = require('../dist/document-loader/vc-schema-loader');
const { SubjectSchemaLoader } = require('../dist/document-loader/subject-schema-loader');

const { 
    createChannel, 
    createTable, 
    checkMessage, 
    checkError 
} = require('./helper');

describe('Loader service', function () {
    let service, channel;

    const LOAD_DID_DOCUMENT = 'load-did-document';
    const LOAD_SCHEMA_DOCUMENT = 'load-schema-document';
    const LOAD_SCHEMA_CONTEXT = 'load-schema-context';

    const schema = {
        "uuid": "b613e284-5af3-465e-a9a9-329a706180fc",
        "name": "Installer",
        "entity": "INSTALLER",
        "status": "PUBLISHED",
        "readonly": true,
        "document": "{\"$id\":\"#b613e284-5af3-465e-a9a9-329a706180fc\",\"$comment\":\"{\\\"term\\\": \\\"b613e284-5af3-465e-a9a9-329a706180fc\\\", \\\"@id\\\": \\\"https://localhost/schema#b613e284-5af3-465e-a9a9-329a706180fc\\\"}\",\"title\":\"\",\"description\":\"\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}]},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}]},\"id\":{\"type\":\"string\"},\"policyId\":{\"$comment\":\"{\\\"term\\\": \\\"policyId\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"title\":\"\",\"description\":\"\",\"type\":\"string\"},\"name\":{\"$comment\":\"{\\\"term\\\": \\\"name\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"title\":\"\",\"description\":\"\",\"type\":\"string\"}},\"required\":[\"policyId\",\"name\"],\"additionalProperties\":false}"
    }

    const did = {
        "did": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656",
        "document": {
            "@context": ["https://www.w3.org/ns/did/v1", "https://ns.did.ai/transmute/v1"],
            "id": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656",
            "verificationMethod": [{
                "id": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656#did-root-key",
                "type": "Ed25519VerificationKey2018",
                "controller": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656",
                "publicKeyBase58": "8Sifp7mtsgSATerukg2CfQMX8yrjfyRWicMGPyYSyMTa"
            }],
            "authentication": "did:hedera:testnet:CDL29KEoA1GTpQfiLxbu2mzbanNVhcsvhmoMAqZhxSoF;hedera:testnet:fid=0.0.16681656#did-root-key",
            "assertionMethod": ["#did-root-key"]
        },
        "status": "CREATE",
        "createDate": {
            "$date": "2021-12-06T19:40:08.901Z"
        },
        "updateDate": {
            "$date": "2021-12-06T19:40:12.668Z"
        }
    };

    before(async function () {
        channel = createChannel();

        const schemaRepository = createTable();
        schemaRepository.find = async function (id) {
            return [schema];
        }
        schemaRepository.findOne = async function (id) {
            return schema;
        }

        const didDocumentRepository = createTable();
        didDocumentRepository.findOne = async function (id) {
            return did;
        }

        const schemaDocumentLoader = new ContextDocumentLoader('https://localhost/schema', schemaRepository);
        const didDocumentLoader = new DIDDocumentLoader(didDocumentRepository);
        const vcSchemaObjectLoader = new VCSchemaLoader(schemaRepository, "https://ipfs.io/ipfs/");
        const subjectSchemaObjectLoader = new SubjectSchemaLoader(schemaRepository, "https://ipfs.io/ipfs/");

        service = loaderAPI(channel, didDocumentRepository, schemaRepository);
    });

    it('Loader service init', async function () {
        assert.exists(channel.map[LOAD_DID_DOCUMENT]);
        assert.exists(channel.map[LOAD_SCHEMA_DOCUMENT]);
        assert.exists(channel.map[LOAD_SCHEMA_CONTEXT]);
    });

    it('Test LOAD_DID_DOCUMENT', async function () {
        let value = await channel.run(LOAD_DID_DOCUMENT, { did: did.did });
        checkMessage(value, did.document);
    });

    it('Test LOAD_SCHEMA_DOCUMENT', async function () {
        let value = await channel.run(LOAD_SCHEMA_DOCUMENT, null);
        checkError(value, 'Document not found');

        value = await channel.run(LOAD_SCHEMA_DOCUMENT, "b613e284-5af3-465e-a9a9-329a706180fc");
        checkMessage(value, schema);

        value = await channel.run(LOAD_SCHEMA_DOCUMENT, ["b613e284-5af3-465e-a9a9-329a706180fc"]);
        checkMessage(value, [schema]);
    });

    it('Test LOAD_SCHEMA_CONTEXT', async function () {
        let value = await channel.run(LOAD_SCHEMA_CONTEXT, null);
        checkError(value, 'Document not found');

        value = await channel.run(LOAD_SCHEMA_CONTEXT, "b613e284-5af3-465e-a9a9-329a706180fc");
        checkMessage(value, schema);

        value = await channel.run(LOAD_SCHEMA_CONTEXT, ["b613e284-5af3-465e-a9a9-329a706180fc"]);
        checkMessage(value, [schema]);
    });
});