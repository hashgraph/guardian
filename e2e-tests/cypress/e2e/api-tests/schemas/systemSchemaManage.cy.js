import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@schemas' }, () => {
    const authorization = Cypress.env("authorization");
    const schemaUUID = "1111b23a-b1ea-408f-a573-6d8bd1a2060a";
    const username = "StandartRegistry";

    it("Delete the system schema with the provided schema ID", () => {
        //Create new schema
        cy.request({
            method: "POST",
            url: API.ApiServer + API.SchemasSystem + username,
            headers: {authorization},
            body: {
                uuid: schemaUUID,
                name: "test",
                description: "new",
                entity: "USER",
                status: "DRAFT",
                readonly: false,
                document: {
                  "$id": "#${schemaUUID}",
                  "$comment": "{ \"@id\": \"schema:${schemaUUID}#${schemaUUID}\", \"term\": \"${schemaUUID}\" }",
                  "title": "wqe",
                  "description": "",
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
                context: null,
                contextURL: "schema:${schemaUUID}",
                fields: [],
                conditions: [],
                active: false,
                system: false,
                category: "POLICY",
                errors: [],
              },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);

            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.SchemasSystem + username,
                headers: {
                    authorization,
                },
            }).then((resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
                expect(resp.body[0]).to.have.property("uuid");

                let schemaUd = resp.body.at(0).uuid;
                expect(schemaUd).to.equal(schemaUUID);
                let schemaId = resp.body.at(0).id;

                cy.request({
                    method: "PUT",
                    url: API.ApiServer + API.SchemasSystem + schemaId,
                    headers: {authorization},
                    body: {
                      id: schemaId,
                      uuid: schemaUd,
                      name: "test",
                      description: "new",
                      entity: "USER",
                      status: "DRAFT",
                      readonly: false,
                      document: {
                        "$id": "#${schemaUUID}",
                        "$comment": "{ \"@id\": \"schema:${schemaUUID}#${schemaUUID}\", \"term\": \"${schemaUUID}\" }",
                        "title": "wqe",
                        "description": "",
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
                      context: null,
                      contextURL: "schema:${schemaUUID}",
                      fields: [],
                      conditions: [],
                      active: false,
                      system: false,
                      category: "POLICY",
                      errors: [],
                    },
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);

                    //Delete schema
                    cy.request({
                        method: "DELETE",
                        url:
                            API.ApiServer +
                            API.SchemasSystem +
                            schemaId,
                        headers: {authorization},
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.NO_CONTENT);
                    });
                });
            });
        });
    });
});
