import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const tagName = "tagSchemaAPI" + Math.floor(Math.random() * 999999);
    const tagId = "d0e99e70-3511-486668e-bf6f-10041e9a0cb7" + Math.floor(Math.random() * 999999);

    it("Create new schema", () => {
        //create tag schema
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Tags + "schemas",
                headers: {
                    authorization,
                },
                body: {
                    "userDID": null,
                    "uuid": tagId,
                    "hash": "",
                    "name": tagName,
                    "description": tagName,
                    "status": "DRAFT",
                    "readonly": false,
                    "system": false,
                    "active": false,
                    "document": {
                        "$id": "#" + tagId,
                        "$comment": "{ \"@id\": \"#\"" + tagId + ", \"term\": " + tagId + " }",
                        "title": tagName,
                        "description": tagName,
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
                            }
                        },
                        "required": [
                            "@context",
                            "type"
                        ],
                        "additionalProperties": false,
                        "$defs": {}
                    },
                    "context": null,
                    "version": "",
                    "creator": "",
                    "owner": "",
                    "messageId": "",
                    "documentURL": "",
                    "contextURL": "",
                    "iri": "",
                    "fields": [],
                    "category": "TAG"
                },
                timeout: 200000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            });
        })
    })
})
