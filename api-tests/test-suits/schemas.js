const axios = require("axios");
const {GetURL, GetToken, GenerateUUIDv4 } = require("../helpers");
const assert = require("assert");

function Schemas() {
    let schemaId, schemaUUID, messageId, schemaBlob;

    it('/schemas/balance', async function() {
        this.timeout(60000);
        let result;

        result = await axios.get(
            GetURL('schemas'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
    });

    it('/schemas/', async function() {
        let result;
        result = await axios.get(
            GetURL('schemas'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);

        schemaUUID = GenerateUUIDv4();

        result = await axios.post(
            GetURL('schemas'),
            {
                "uuid": schemaUUID,
                "hash": "",
                "status": "DRAFT",
                "readonly": false,
                "name": "test",
                "description": "test",
                "entity": "NONE",
                "document": `{\"$id\":\"#${schemaUUID}\",\"$comment\":\"{\\\"term\\\": \\\"${schemaUUID}\\\", \\\"@id\\\": \\\"https://localhost/schema#${schemaUUID}\\\"}\",\"title\":\"test\",\"description\":\" test\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"id\":{\"type\":\"string\",\"readOnly\":true},\"field0\":{\"title\":\"test field\",\"description\":\"test field\",\"readOnly\":false,\"$comment\":\"{\\\"term\\\": \\\"field0\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"type\":\"string\"}},\"required\":[\"@context\",\"type\"],\"additionalProperties\":false}`,
                "schema": {
                    "$id": `#${schemaUUID}`,
                    "$comment": `{\"term\": \"${schemaUUID}\", \"@id\": \"https://localhost/schema#${schemaUUID}\"}`,
                    "title": "test",
                    "description": " test",
                    "type": "object",
                    "properties": {
                        "@context": {
                            "oneOf": [{ "type": "string" }, {
                                "type": "array",
                                "items": { "type": "string" }
                            }], "readOnly": true
                        },
                        "type": {
                            "oneOf": [{ "type": "string" }, { "type": "array", "items": { "type": "string" } }],
                            "readOnly": true
                        },
                        "id": { "type": "string", "readOnly": true },
                        "field0": {
                            "title": "test field",
                            "description": "test field",
                            "readOnly": false,
                            "$comment": "{\"term\": \"field0\", \"@id\": \"https://www.schema.org/text\"}",
                            "type": "string"
                        }
                    },
                    "required": ["@context", "type"],
                    "additionalProperties": false
                },
                "ref": null,
                "fields": [{
                    "name": "field0",
                    "title": "test field",
                    "description": "test field",
                    "required": false,
                    "isArray": false,
                    "isRef": false,
                    "type": "string",
                    "readOnly": false
                }],
                "context": null
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
        schemaId = result.data.find(s => s.uuid === schemaUUID).id;
    });

    it('/schemas/{schemaId}/publish', async function() {
        this.timeout(90000);
        let result;
        result = await axios.put(
                GetURL('schemas', schemaId, 'publish'),
                {version: '1.0.0'},
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                    }
                }
            );
        assert.equal(Array.isArray(result.data), true);
    })

    it('/schemas/{schemaId}/export/message', async function() {
        let result;
        result = await axios.get(
            GetURL('schemas', schemaId, 'export', 'message'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        messageId = result.data.messageId;

        delete result.data.owner

        assert.deepEqual(result.data, {
            id: schemaId,
            name: 'test',
            description: 'test',
            version: '1.0.0',
            messageId: messageId,
        });
    })

    it('/schemas/{schemaId}/export/file', async function() {
        let result;
        result = await axios.get(
            GetURL('schemas', schemaId, 'export', 'file'),
            {
                headers: {
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                },
                responseType: 'arraybuffer'
            }
        );
        schemaBlob = result.data;
    })

    it('/schemas/import/file/preview', async function() {
        this.timeout(90000);
        let result;
        result = await axios.post(
            GetURL('schemas', 'import', 'file', 'preview'),
            schemaBlob,
            {
                headers: {
                    'Content-Type': 'binary/octet-stream',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.deepEqual(result.data,  [{
            "uuid": result.data[0].uuid,
            "hash": "",
            "readonly": false,
            "name": "test",
            "description": "test",
            "entity": "NONE",
            "context": `{"@context":{"@version":1.1,"@vocab":"https://w3id.org/traceability/#undefinedTerm","id":"@id","type":"@type","${result.data[0].uuid}&1.0.0":{"@id":"#${result.data[0].uuid}&1.0.0","@context":{"field0":{"@id":"https://www.schema.org/text"}}}}}`,
            "contextURL": result.data[0].contextURL,
            "creator": result.data[0].creator,
            "documentURL": result.data[0].documentURL,
            "document": `{\"$id\":\"#${result.data[0].uuid}&${result.data[0].version}\",\"$comment\":\"{\\\"term\\\": \\\"${result.data[0].uuid}&${result.data[0].version}\\\", \\\"@id\\\": \\\"#${result.data[0].uuid}&${result.data[0].version}\\\"}\",\"title\":\"test\",\"description\":\" test\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"id\":{\"type\":\"string\",\"readOnly\":true},\"field0\":{\"title\":\"test field\",\"description\":\"test field\",\"readOnly\":false,\"$comment\":\"{\\\"term\\\": \\\"field0\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"type\":\"string\"}},\"required\":[\"@context\",\"type\"],\"additionalProperties\":false}`,
            "status": "PUBLISHED",
            "id": result.data[0].id,
            "iri": result.data[0].iri,
            "messageId": result.data[0].messageId,
            "version": result.data[0].version,
            "owner": result.data[0].owner
        }]);

        assert.equal(result.data[0].uuid, schemaUUID);
    });

    it('/message/schemas/import/file', async function() {
        let result;
        result = await axios.post(
            GetURL('schemas', 'import', 'file'),
            schemaBlob,
            {
                headers: {
                    'Content-Type': 'binary/octet-stream',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );

        assert.equal(Array.isArray(result.data), true);
    })

    it('/schemas/{schemaId}', async function() {
        let result;
        result = await axios.delete(
            GetURL('schemas', schemaId),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
    })
}

module.exports = {
    Schemas
}
