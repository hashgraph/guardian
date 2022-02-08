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
            {"hash":"","status":"DRAFT","readonly":false,"name":"test","description":" test","entity":"NONE","document":"{\"$id\":\"#4be07ddd-95e3-409d-baad-64cb910cac4d\",\"$comment\":\"{\\\"term\\\": \\\"4be07ddd-95e3-409d-baad-64cb910cac4d\\\", \\\"@id\\\": \\\"https://localhost/schema#4be07ddd-95e3-409d-baad-64cb910cac4d\\\"}\",\"title\":\"test\",\"description\":\" test\",\"type\":\"object\",\"properties\":{\"@context\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"type\":{\"oneOf\":[{\"type\":\"string\"},{\"type\":\"array\",\"items\":{\"type\":\"string\"}}],\"readOnly\":true},\"id\":{\"type\":\"string\",\"readOnly\":true},\"field0\":{\"title\":\"test field\",\"description\":\"test field\",\"readOnly\":false,\"$comment\":\"{\\\"term\\\": \\\"field0\\\", \\\"@id\\\": \\\"https://www.schema.org/text\\\"}\",\"type\":\"string\"}},\"required\":[\"@context\",\"type\"],\"additionalProperties\":false}","schema":{"$id":"#4be07ddd-95e3-409d-baad-64cb910cac4d","$comment":"{\"term\": \"4be07ddd-95e3-409d-baad-64cb910cac4d\", \"@id\": \"https://localhost/schema#4be07ddd-95e3-409d-baad-64cb910cac4d\"}","title":"test","description":" test","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"test field","description":"test field","readOnly":false,"$comment":"{\"term\": \"field0\", \"@id\": \"https://www.schema.org/text\"}","type":"string"}},"required":["@context","type"],"additionalProperties":false},"ref":null,"fields":[{"name":"field0","title":"test field","description":"test field","required":false,"isArray":false,"isRef":false,"type":"string","readOnly":false}],"context":null},
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

    // it('/schemas/{schemaId}/unpublish', async function() {
    //     let result;
    //     result = await axios.put(
    //         GetURL('schemas', schemaId, 'unpublish'),
    //         {},
    //         {
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${GetToken('RootAuthority')}`,
    //             }
    //         }
    //     );
    //     assert.equal(Array.isArray(result.data), true);
    // })

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

    it('/schemas/import/preview', async function() {
        this.timeout(90000);
        let result;
        result = await axios.post(
            GetURL('schemas', 'import', 'preview'),
            {messageId: "1644249635.696219588"},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.deepEqual(result.data,  {
            uuid: '53ff1329-850e-40ec-b9bc-7ebb59d2eb16',
            hash: '',
            name: 'e2e',
            description: 'e2e',
            entity: 'VC',
            status: 'PUBLISHED',
            readonly: false,
            document: '{"$id":"#53ff1329-850e-40ec-b9bc-7ebb59d2eb16&1.0.0","$comment":"{ \\"term\\": \\"53ff1329-850e-40ec-b9bc-7ebb59d2eb16&1.0.0\\", \\"@id\\": \\"#53ff1329-850e-40ec-b9bc-7ebb59d2eb16&1.0.0\\" }","title":"e2e","description":"e2e","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"test field","description":"test field","readOnly":false,"$comment":"{ \\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\" }","type":"string"},"policyId":{"title":"policyId","description":"policyId","readOnly":true,"$comment":"{ \\"term\\": \\"policyId\\", \\"@id\\": \\"https://www.schema.org/text\\" }","type":"string"},"ref":{"title":"ref","description":"ref","readOnly":true,"$comment":"{ \\"term\\": \\"ref\\", \\"@id\\": \\"https://www.schema.org/text\\" }","type":"string"}},"required":["@context","type","policyId"],"additionalProperties":false,"$defs":{}}',
            context: '{"@context":{"@version":1.1,"@vocab":"https://w3id.org/traceability/#undefinedTerm","id":"@id","type":"@type","53ff1329-850e-40ec-b9bc-7ebb59d2eb16&1.0.0":{"@id":"#53ff1329-850e-40ec-b9bc-7ebb59d2eb16&1.0.0","@context":{"field0":{"@id":"https://www.schema.org/text"},"policyId":{"@id":"https://www.schema.org/text"},"ref":{"@id":"https://www.schema.org/text"}}}}}',
            version: '1.0.0', creator: 'did:hedera:testnet:F2NNCWg6A7asdZqKyVo6LgS1bjyeAQBwraew2vXoXypQ;hedera:testnet:fid=0.0.29632785',
            owner: null,
            topicId: '0.0.29614911',
            messageId: '1644249635.696219588',
            documentURL: 'https://ipfs.io/ipfs/bafkreifdjbqkp33t2vtrephwbyxs7dmmop3zr7dizhwywshtmza2z2ytbi',
            contextURL: 'https://ipfs.io/ipfs/bafkreiblli54nk2zgrywtpza44a2grzm7ulmmmoxva4ejb6hs2dexjmrhu',
            iri: '#53ff1329-850e-40ec-b9bc-7ebb59d2eb16&1.0.0'
        });
    });

    it('/schemas/import', async function() {
        let result;
        result = await axios.post(
            GetURL('schemas', 'import'),
            {"messageId":"1644249635.696219588"},
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
            { ids: [schemaId]},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.deepEqual(result.data, []);
    })
}

module.exports = {
    Schemas
}
