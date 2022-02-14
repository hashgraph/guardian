const axios = require("axios");
const {GetURL, GetToken} = require("../helpers");
const assert = require("assert");

function Policies() {
    let policyId, policyTag, policyOwner;
    let policy, policyMessageId, policyImportObject, policyBlob;
    let blockId, blockTag;

    it('/policies', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('policies'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);

        const schema = (await axios.get(
            GetURL('schemas'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        )).data.find(s => s.entity === 'ROOT_AUTHORITY');

        result = await axios.post(
            GetURL('policies'),
            {
                "name": "e2e",
                "description": "",
                "topicDescription": "",
                "config": {
                    "blockType": "interfaceContainerBlock",
                    "id": "476cb893-1de6-4daa-aaec-b0ef3e556cab",
                    "children": [{
                        "id": "bb2e5ee1-79e4-473d-b6d9-007bff6dd886",
                        "tag": "Block4",
                        "blockType": "interfaceContainerBlock",
                        "defaultActive": true,
                        "children": [{
                            "id": "33a892f7-ad5b-45de-b512-9cff9448c5f3",
                            "tag": "Block2",
                            "blockType": "policyRolesBlock",
                            "defaultActive": true,
                            "children": [],
                            "permissions": ["NO_ROLE"],
                            "uiMetaData": { "title": "Test" },
                            "roles": ["Test_role"]
                        }, {
                            "id": "8a164762-a4bc-45ad-b846-10dba5987915",
                            "tag": "Block5",
                            "blockType": "informationBlock",
                            "defaultActive": true,
                            "children": [],
                            "uiMetaData": { "type": "text", "title": "Test", "description": "Test" },
                            "permissions": ["Test_role"]
                        }, {
                            "id": "bd348401-6955-4964-850e-6a5d6e0cfd32",
                            "tag": "Block6",
                            "blockType": "interfaceDocumentsSource",
                            "defaultActive": true,
                            "children": [{
                                "id": "ec4aff17-38a4-43d0-942a-eb107d0869da",
                                "tag": "Block7",
                                "blockType": "documentsSourceAddon",
                                "defaultActive": true,
                                "children": [],
                                "permissions": ["OWNER", "ANY_ROLE"],
                                "filters": [],
                                "dataType": "vc-documents",
                                "schema": schema.iri
                            }],
                            "permissions": ["OWNER", "ANY_ROLE"],
                            "uiMetaData": {
                                "fields": [{
                                    "title": "",
                                    "name": "document.id",
                                    "tooltip": "",
                                    "type": "text"
                                }]
                            }
                        }, {
                            "id": "44973d3a-ac0f-43d5-8b2b-cea4a7290342",
                            "tag": "Block9",
                            "blockType": "interfaceStepBlock",
                            "defaultActive": true,
                            "children": [{
                                "id": "70a43732-3b6c-4eca-8f13-c02583878a6a",
                                "tag": "Block8",
                                "blockType": "requestVcDocument",
                                "defaultActive": true,
                                "children": [],
                                "permissions": ["OWNER", "ANY_ROLE"],
                                "uiMetaData": { "privateFields": [], "type": "page", "title": "Test" },
                                "schema": schema.iri
                            }, {
                                "id": "d42c2739-dc87-46a4-8b6e-54beb6838293",
                                "tag": "Block10",
                                "blockType": "sendToGuardian",
                                "defaultActive": true,
                                "children": [],
                                "permissions": ["OWNER", "ANY_ROLE"],
                                "uiMetaData": {},
                                "dataType": "vc-documents",
                                "entityType": "test"
                            }],
                            "permissions": ["OWNER", "ANY_ROLE"],
                            "uiMetaData": {},
                            "cyclic": true
                        }],
                        "uiMetaData": { "type": "tabs" },
                        "permissions": ["OWNER", "ANY_ROLE"]
                    }],
                    "uiMetaData": { "type": "blank" },
                    "permissions": ["ANY_ROLE"],
                    "defaultActive": true
                },
                "owner": "did:hedera:testnet:CWfVb5bREzxcgAWuoJ1AMrFMvhJhcj9Ynv7HkNeSkxHF;hedera:testnet:fid=0.0.29515157",
                "policyRoles": ["Test_role"],
                "registeredUsers": { "did:hedera:testnet:CWfVb5bREzxcgAWuoJ1AMrFMvhJhcj9Ynv7HkNeSkxHF;hedera:testnet:fid=0.0.29515157": "Test_role" },
                "topicId": "0.0.29592526",
                "policyTag": "e2e"
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        policyId = result.data[0].id;
        policyTag = result.data[0].policyTag;
        policyOwner = result.data[0].owner;
        assert.equal(Array.isArray(result.data), true);
    })

    it('/policies/{policyId}', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('policies', policyId),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        policy = result.data;
        assert.equal(result.data.name, 'e2e')

        result = await axios.put(
            GetURL('policies', policyId),
            policy,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        policy = result.data;
        assert.equal(result.data.name, 'e2e');
    })

    it('/policies/validate', async function() {
        this.timeout(60000);
        let result;
        result = await axios.post(
            GetURL('policies', 'validate'),
            policy,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        let valid = true;
        result.data.results.blocks.forEach(b => {
            valid = valid && b.isValid
        })
        assert.equal(valid, true)
    });

    it('/policies/{policyId}/publish', async function() {
        this.timeout(60000);
        let result;
        result = await axios.put(
            GetURL('policies', policyId, 'publish'),
            {policyVersion: '1.0.0'},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(result.data.isValid, true);
    });

    it('/policies/{policyId}/blocks', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('policies', policyId, 'blocks'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(result.data.blockType, 'interfaceContainerBlock')
    });

    it('/policies/{policyId}/tag/{tag}', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('policies', policyId, 'tag', 'Block2'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        blockId = result.data.id;
        assert.deepEqual(result.data, {id: blockId})
    });

    it('/policies/{policyId}/blocks/{uuid}', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('policies', policyId, 'blocks', blockId),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
        assert.deepEqual(result.data, { roles: [ 'Test_role' ], uiMetaData: { title: 'Test' } });

        result = await axios.post(
            GetURL('policies', policyId, 'blocks', blockId),
            {"role":"Test_role"},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('Installer')}`,
                }
            }
        );
        assert.equal(result.data.config.blockType, 'interfaceContainerBlock')
    });

    it('/policies/{policyId}/export/file', async function() {
        this.timeout(60000);
        let result;
        result = await axios.get(
            GetURL('policies', policyId, 'export', 'file'),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                },
                responseType: 'arraybuffer'
            }
        );
        policyBlob = result.data;
    });

    it('/policies/import/file/preview', async function() {
        this.timeout(60000);
        let result;
        result = await axios.post(
            GetURL('policies', 'import', 'file', 'preview'),
            policyBlob,
            {
                headers: {
                    'Content-Type': 'binary/octet-stream',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        policyImportObject = result.data;
        assert.equal(result.data.policy.name, "e2e");
    });

    it('/policies/import/file', async function() {
        this.timeout(60000);
        let result;
        policyImportObject.policy.version = '2.0.0';

        result = await axios.post(
            GetURL('policies', 'import', 'file'),
            policyBlob,
            {
                headers: {
                    'Content-Type': 'binary/octet-stream',
                    'Authorization': `Bearer ${GetToken('RootAuthority')}`,
                }
            }
        );
        assert.equal(Array.isArray(result.data), true);

    });

    it('/external', async function() {
        this.timeout(60000);
        let result;
        result = await axios.post(
            GetURL('external'),
            {
                "owner": policyOwner,
                "policyTag": policyTag,
                "document": {}
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        assert.equal(result.data, true);
    })
}

module.exports = {
    Policies
}
