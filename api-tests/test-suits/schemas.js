const axios = require("axios");
const {GetURL, GetToken} = require("../helpers");
const assert = require("assert");

function Schemas() {
    let schemaId;

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

        result = await axios.post(
            GetURL('schemas'),
            {"uuid":"4be07ddd-95e3-409d-baad-64cb910cac4a","hash":"","id":"","status":"DRAFT","readonly":false,"name":"test","description":" test","entity":"NONE","document":"{\"$id\":\"#4be07ddd-95e3-409d-baad-64cb910cac4d\",\"$comment\":\"{\\\"term\\\": \\\"4be07ddd-95e3-409d-baad-64cb910cac4d\\\", \\\"@id\\\": \\\"https://localhost/schema#4be07ddd-95e3-409d-baad-64cb910cac4d\\\"}\",\"title\":\"test\",\"description\":\" test\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"id\":{\"type\":\"string\",\"readOnly\":true},\"field0\":{\"title\":\"test field\",\"description\":\"test field\",\"readOnly\":false,\"$comment\":\"{\\\"term\\\": \\\"field0\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"type\":\"string\"}},\"required\":[\"@context\",\"type\"],\"additionalProperties\":false}","schema":{"$id":"#4be07ddd-95e3-409d-baad-64cb910cac4d","$comment":"{\"term\": \"4be07ddd-95e3-409d-baad-64cb910cac4d\", \"@id\": \"https://localhost/schema#4be07ddd-95e3-409d-baad-64cb910cac4d\"}","title":"test","description":" test","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"test field","description":"test field","readOnly":false,"$comment":"{\"term\": \"field0\", \"@id\": \"https://www.schema.org/text\"}","type":"string"}},"required":["@context","type"],"additionalProperties":false},"ref":null,"fields":[{"name":"field0","title":"test field","description":"test field","required":false,"isArray":false,"isRef":false,"type":"string","readOnly":false}],"context":null},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
        schemaId = result.data.find(s => s.status === 'DRAFT').id;
    });

    // it('/schemas/{schemaId}', async function() {
    //     let result;
    //     result = await axios.put(
    //         GetURL('schemas', schemaId),
    //         {"uuid":"4be07ddd-95e3-409d-baad-64cb910cac4a","hash":"","id":"","status":"DRAFT","readonly":false,"name":"test","description":" test","entity":"NONE","document":"{\"$id\":\"#4be07ddd-95e3-409d-baad-64cb910cac4d\",\"$comment\":\"{\\\"term\\\": \\\"4be07ddd-95e3-409d-baad-64cb910cac4d\\\", \\\"@id\\\": \\\"https://localhost/schema#4be07ddd-95e3-409d-baad-64cb910cac4d\\\"}\",\"title\":\"test\",\"description\":\" test\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"id\":{\"type\":\"string\",\"readOnly\":true},\"field0\":{\"title\":\"test field\",\"description\":\"test field\",\"readOnly\":false,\"$comment\":\"{\\\"term\\\": \\\"field0\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"type\":\"string\"}},\"required\":[\"@context\",\"type\"],\"additionalProperties\":false}","schema":{"$id":"#4be07ddd-95e3-409d-baad-64cb910cac4d","$comment":"{\"term\": \"4be07ddd-95e3-409d-baad-64cb910cac4d\", \"@id\": \"https://localhost/schema#4be07ddd-95e3-409d-baad-64cb910cac4d\"}","title":"test","description":" test","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"test field","description":"test field","readOnly":false,"$comment":"{\"term\": \"field0\", \"@id\": \"https://www.schema.org/text\"}","type":"string"}},"required":["@context","type"],"additionalProperties":false},"ref":null,"fields":[{"name":"field0","title":"test field","description":"test field","required":false,"isArray":false,"isRef":false,"type":"string","readOnly":false}],"context":null},
    //         {
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${GetToken('RootAuthority')}`,
    //             }
    //         }
    //     );
    //     assert.equal(Array.isArray(result.data), true);
    // })

    it('/schemas/{schemaId}/publish', async function() {
        let result;
        result = await axios.put(
            GetURL('schemas', schemaId, 'publish'),
            {version: '1'},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
    })

    it('/schemas/{schemaId}/unpublish', async function() {
        let result;
        result = await axios.put(
            GetURL('schemas', schemaId, 'unpublish'),
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
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

    it('/schemas/import', async function() {
        let result;
        result = await axios.post(
            GetURL('schemas', 'import'),
            {schemes: [{"name":"e2e","uuid":"e5c2ddb2-c2d2-48e0-98a2-d61fd3c022bf","entity":"NONE","document":"{\"$id\":\"#e5c2ddb2-c2d2-48e0-98a2-d61fd3c022bf&1.0.0\",\"$comment\":\"{ \\\"term\\\": \\\"e5c2ddb2-c2d2-48e0-98a2-d61fd3c022bf&1.0.0\\\", \\\"@id\\\": \\\"https://localhost/schema#e5c2ddb2-c2d2-48e0-98a2-d61fd3c022bf&1.0.0\\\" }\",\"title\":\"e2e\",\"description\":\"\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"id\":{\"type\":\"string\",\"readOnly\":true},\"field0\":{\"title\":\"test field\",\"description\":\"test field\",\"readOnly\":false,\"$comment\":\"{ \\\"term\\\": \\\"field0\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\" }\",\"type\":\"string\"}},\"required\":[\"@context\",\"type\"],\"additionalProperties\":false}","relationships":[]}]},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);
    })

    it('/schemas/export', async function() {
        let result;
        result = await axios.post(
            GetURL('schemas', 'export'),
            { refs: []},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.deepEqual(result.data, {schemes: []});
    })
}

module.exports = {
    Schemas
}
