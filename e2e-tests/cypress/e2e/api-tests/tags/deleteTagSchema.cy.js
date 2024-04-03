import {STATUS_CODE} from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Tags", {tags: '@tags'}, () => {
    const authorization = Cypress.env("authorization");
    const tagName = "tagSchemaAPI" + Math.floor(Math.random() * 999999);
    const tagId = "d0e99e70-3511-486668e-bf6f-10041e9a0cb7" + Math.floor(Math.random() * 999999);
    let schemaId;

    before(() => {
        //create tag schema for delete
        cy.request({
            method: "POST",
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
            schemaId = response.body.id;
        });
    })

    it("Delete tag(schema)", () => {
        //delete tag schema
        cy.request({
            method: "DELETE",
            url: API.ApiServer + API.Tags + "schemas/" + schemaId,
            headers: {
                authorization,
            },
            timeout: 200000
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
        });
    })
})
