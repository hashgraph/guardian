import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@schemas' }, () => {
    const authorization = Cypress.env("authorization");

    it("Updates the system schema with the provided schema ID", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            const schemaId = resp.body.at(-1).id;
            const schemaUUId = resp.body.at(-1).uuid;

            cy.request({
                method: "GET",
                url: API.ApiServer + API.SchemasSystem + schemaId,
                headers: { authorization },
                body: {
                    id: schemaId,
                    uuid: schemaUUId,
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
            });
        });
    });
});
