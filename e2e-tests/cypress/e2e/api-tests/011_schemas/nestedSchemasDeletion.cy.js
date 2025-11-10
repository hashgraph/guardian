import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schema", { tags: ['schema', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const policyName = "forNestedSchemaTest";
    const schemaNameA = "schemaA";
    const schemaNameB = "schemaB";

    let topicId, schemaAId, schemaBId;

    before("Create policy", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
                body: {
                    name: policyName,
                    policyTag: "Tag_11223344",
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                topicId = response.body.at(0).topicId;
            });
        })
    });

    before("Create schemas and nest one of them", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Schemas + topicId,
                headers: {
                    authorization,
                },
                body: {
                    "uuid": "de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                    "name": schemaNameA,
                    "entity": "NONE",
                    "status": "DRAFT",
                    "readonly": false,
                    "document": {
                        "$id": "#de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                        "$comment": "{ \"@id\": \"schema:de21cc0a-18ad-47c0-ae82-aefe7107fc61#de21cc0a-18ad-47c0-ae82-aefe7107fc61\", \"term\": \"de21cc0a-18ad-47c0-ae82-aefe7107fc61\" }",
                        "title": schemaNameA,
                        "type": "object",
                        "additionalProperties": false,
                    },
                    "topicId": topicId,
                    "contextURL": "schema:de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                    "active": false,
                    "system": false,
                    "category": "POLICY"
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Schemas + topicId,
                    headers: {
                        authorization,
                    },
                    body: {
                        "uuid": "f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                        "name": schemaNameB,
                        "entity": "NONE",
                        "status": "DRAFT",
                        "readonly": false,
                        "document": {
                            "$id": "#f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                            "$comment": "{ \"@id\": \"schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8#f5d3e328-cd4e-4819-a807-c98c4a5795f8\", \"term\": \"f5d3e328-cd4e-4819-a807-c98c4a5795f8\" }",
                            "title": schemaNameB,
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
                                "field0": {
                                    "title": "field0",
                                    "description": schemaNameA,
                                    "readOnly": false,
                                    "$ref": "#de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                                    "$comment": "{\"term\":\"field0\",\"@id\":\"schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8#de21cc0a-18ad-47c0-ae82-aefe7107fc61\",\"availableOptions\":[],\"orderPosition\":0}"
                                }
                            },
                            "required": [
                                "@context",
                                "type"
                            ],
                            "additionalProperties": false,
                            "$defs": {
                                "#de21cc0a-18ad-47c0-ae82-aefe7107fc61": {
                                    "$id": "#de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                                    "$comment": "{ \"@id\": \"schema:de21cc0a-18ad-47c0-ae82-aefe7107fc61#de21cc0a-18ad-47c0-ae82-aefe7107fc61\", \"term\": \"de21cc0a-18ad-47c0-ae82-aefe7107fc61\" }",
                                    "title": schemaNameA,
                                    "type": "object",
                                    "additionalProperties": false
                                }
                            }
                        },
                        "topicId": topicId,
                        "contextURL": "schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                        "active": false,
                        "system": false,
                        "category": "POLICY",
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.Schemas,
                        headers: {
                            authorization,
                        },
                        qs: {
                            category: "POLICY",
                            topicId: topicId
                        }
                    }).then((response) => {
                        schemaAId = response.body.at(1).id;
                        schemaBId = response.body.at(0).id;
                    })
                });
            });
        });
    });

    it("Delete schema without child deletion", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: API.ApiServer + API.Schemas + schemaBId,
                headers: {
                    authorization,
                },
                qs: {
                    includeChildren: false
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Schemas,
                    headers: {
                        authorization,
                    },
                    qs: {
                        category: "POLICY",
                        topicId: response.body.at(0).topicId
                    }
                }).then((response) => {
                    expect(response.body.length).eql(1);
                    expect(response.body.at(0).id).eql(schemaAId);
                })
            });
        });
    });

    it("Delete schema with child deletion", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Schemas + topicId,
                headers: {
                    authorization,
                },
                body: {
                    "uuid": "f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                    "name": schemaNameB,
                    "entity": "NONE",
                    "status": "DRAFT",
                    "readonly": false,
                    "document": {
                        "$id": "#f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                        "$comment": "{ \"@id\": \"schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8#f5d3e328-cd4e-4819-a807-c98c4a5795f8\", \"term\": \"f5d3e328-cd4e-4819-a807-c98c4a5795f8\" }",
                        "title": schemaNameB,
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
                            "field0": {
                                "title": "field0",
                                "description": schemaNameA,
                                "readOnly": false,
                                "$ref": "#de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                                "$comment": "{\"term\":\"field0\",\"@id\":\"schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8#de21cc0a-18ad-47c0-ae82-aefe7107fc61\",\"availableOptions\":[],\"orderPosition\":0}"
                            }
                        },
                        "required": [
                            "@context",
                            "type"
                        ],
                        "additionalProperties": false,
                        "$defs": {
                            "#de21cc0a-18ad-47c0-ae82-aefe7107fc61": {
                                "$id": "#de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                                "$comment": "{ \"@id\": \"schema:de21cc0a-18ad-47c0-ae82-aefe7107fc61#de21cc0a-18ad-47c0-ae82-aefe7107fc61\", \"term\": \"de21cc0a-18ad-47c0-ae82-aefe7107fc61\" }",
                                "title": schemaNameA,
                                "type": "object",
                                "additionalProperties": false
                            }
                        }
                    },
                    "topicId": topicId,
                    "contextURL": "schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                    "active": false,
                    "system": false,
                    "category": "POLICY",
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Schemas,
                    headers: {
                        authorization,
                    },
                    qs: {
                        category: "POLICY",
                        topicId: topicId
                    }
                }).then((response) => {
                    schemaBId = response.body.at(0).id;
                    cy.request({
                        method: METHOD.DELETE,
                        url: API.ApiServer + API.Schemas + schemaBId,
                        headers: {
                            authorization,
                        },
                        qs: {
                            includeChildren: true
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiServer + API.Schemas,
                            headers: {
                                authorization,
                            },
                            qs: {
                                category: "POLICY",
                                topicId: response.body.at(0).topicId
                            }
                        }).then((response) => {
                            expect(response.body.length).eql(0);
                        })
                    });
                });
            });
        })
    });

    it("Delete all policy schemas", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Schemas + topicId,
                headers: {
                    authorization,
                },
                body: {
                    "uuid": "de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                    "name": schemaNameA,
                    "entity": "NONE",
                    "status": "DRAFT",
                    "readonly": false,
                    "document": {
                        "$id": "#de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                        "$comment": "{ \"@id\": \"schema:de21cc0a-18ad-47c0-ae82-aefe7107fc61#de21cc0a-18ad-47c0-ae82-aefe7107fc61\", \"term\": \"de21cc0a-18ad-47c0-ae82-aefe7107fc61\" }",
                        "title": schemaNameA,
                        "type": "object",
                        "additionalProperties": false,
                    },
                    "topicId": topicId,
                    "contextURL": "schema:de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                    "active": false,
                    "system": false,
                    "category": "POLICY"
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Schemas + topicId,
                    headers: {
                        authorization,
                    },
                    body: {
                        "uuid": "f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                        "name": schemaNameB,
                        "entity": "NONE",
                        "status": "DRAFT",
                        "readonly": false,
                        "document": {
                            "$id": "#f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                            "$comment": "{ \"@id\": \"schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8#f5d3e328-cd4e-4819-a807-c98c4a5795f8\", \"term\": \"f5d3e328-cd4e-4819-a807-c98c4a5795f8\" }",
                            "title": schemaNameB,
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
                                "field0": {
                                    "title": "field0",
                                    "description": schemaNameA,
                                    "readOnly": false,
                                    "$ref": "#de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                                    "$comment": "{\"term\":\"field0\",\"@id\":\"schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8#de21cc0a-18ad-47c0-ae82-aefe7107fc61\",\"availableOptions\":[],\"orderPosition\":0}"
                                }
                            },
                            "required": [
                                "@context",
                                "type"
                            ],
                            "additionalProperties": false,
                            "$defs": {
                                "#de21cc0a-18ad-47c0-ae82-aefe7107fc61": {
                                    "$id": "#de21cc0a-18ad-47c0-ae82-aefe7107fc61",
                                    "$comment": "{ \"@id\": \"schema:de21cc0a-18ad-47c0-ae82-aefe7107fc61#de21cc0a-18ad-47c0-ae82-aefe7107fc61\", \"term\": \"de21cc0a-18ad-47c0-ae82-aefe7107fc61\" }",
                                    "title": schemaNameA,
                                    "type": "object",
                                    "additionalProperties": false
                                }
                            }
                        },
                        "topicId": topicId,
                        "contextURL": "schema:f5d3e328-cd4e-4819-a807-c98c4a5795f8",
                        "active": false,
                        "system": false,
                        "category": "POLICY",
                    }
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    cy.request({
                        method: METHOD.DELETE,
                        url: API.ApiServer + API.Schemas + API.Topic + topicId,
                        headers: {
                            authorization,
                        }
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                        cy.request({
                            method: METHOD.GET,
                            url: API.ApiServer + API.Schemas,
                            headers: {
                                authorization,
                            },
                            qs: {
                                category: "POLICY",
                                topicId: topicId
                            }
                        }).then((response) => {
                            expect(response.body.length).eql(0);
                        })
                    })
                });
            });
        });
    });
});
