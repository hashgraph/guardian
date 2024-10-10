import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");
    const schemaUUID = ("0000b23a-b1ea-408f-a573" + Math.floor(Math.random() * 999999) + "a2060a")

    before(() => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas,
            headers: {
                authorization,
            },
        }).then((response) => {
            const topicUid = response.body.at(-1).topicId;
            //Create new schema
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Schemas + topicUid,
                headers: { authorization },
                body: {
                    uuid: schemaUUID,
                    name: "q",
                    entity: "VC",
                    status: "DRAFT",
                    readonly: false,
                    document: {
                        "$id": "#" + schemaUUID + "",
                        "$comment": "{ \"@id\": \"schema:" + schemaUUID + "#" + schemaUUID + "\", \"term\": \"" + schemaUUID + "\" }",
                        "title": "q",
                        "type": "object",
                        "properties": {
                            "@context": {
                                "oneOf": [
                                    {
                                        "type": "string"
                                    },
                                    {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        }
                                    }
                                ],
                                "readOnly": true
                            },
                            "type": {
                                "oneOf": [
                                    {
                                        "type": "string"
                                    },
                                    {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        }
                                    }
                                ],
                                "readOnly": true
                            },
                            "id": {
                                "type": "string",
                                "readOnly": true
                            },
                            "policyId": {
                                "title": "policyId",
                                "description": "policyId",
                                "readOnly": true,
                                "type": "string",
                                "$comment": "{\"term\":\"policyId\",\"@id\":\"https://www.schema.org/text\"}"
                            },
                            "ref": {
                                "title": "ref",
                                "description": "ref",
                                "readOnly": true,
                                "type": "string",
                                "$comment": "{\"term\":\"ref\",\"@id\":\"https://www.schema.org/text\"}"
                            }
                        },
                        "required": [
                            "@context",
                            "type",
                            "policyId"
                        ],
                        "additionalProperties": false,
                        "$defs": {}
                    },
                    topicId: topicUid,
                    active: false,
                    system: false,
                    category: "POLICY",
                },
            });
        });
    })

    it("Publish the schema with the provided (internal) schema ID", { tags: ['smoke'] }, () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas,
            headers: {
                authorization,
            },
        }).then((response) => {

            let schemaId = response.body.at(0).id;

            const versionNum = "1." + Math.floor(Math.random() * 999);
            //Publish schema
            cy.request({
                method: METHOD.PUT,
                url:
                    API.ApiServer +
                    API.Schemas +
                    schemaId +
                    "/publish",
                headers: { authorization },
                body: {
                    version: versionNum,
                },
            })
        });
    });
});
