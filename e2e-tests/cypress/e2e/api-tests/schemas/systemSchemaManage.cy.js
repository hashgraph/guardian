import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");
    const schemaUUID = "1111b23a-b1ea-408f-a573-6d8bd1a2060a";
    const username = "StandartRegistry";

    it("Delete the system schema with the provided schema ID", () => {
        //Create new schema
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.SchemasSystem + username,
            headers: {authorization},
            body: {
                uuid: schemaUUID,
                name: "test",
                description: "new",
                entity: "USER",
                status: "DRAFT",
                readonly: false,
                name: "test",
                entity: "USER",
                document:
                        {
                            $id: schemaUUID,
                            $comment:'{\"term\\": \"${schemaUUID}\\", \"@id\\": \"https://localhost/schema#${schemaUUID}\\"}',
                            title:"test",
                            description:" test",
                            type:"object",
                            properties:{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},
                            type:{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},
                            id:{"type":"string","readOnly":true},
                            field0:{"title":"test field","description":"test field","readOnly":false,"$comment":'{\\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\"}',"type":"string"}},
                            required:["@context","type"],
                            additionalProperties:false
                        },
                    },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);

            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.SchemasSystem + username,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body[0]).to.have.property("uuid");

                let schemaUd = response.body.at(0).uuid;
                expect(schemaUd).to.equal(schemaUUID);
                let schemaId = response.body.at(0).id;

                cy.request({
                    method: METHOD.PUT,
                    url: API.ApiServer + API.SchemasSystem + schemaId,
                    headers: {authorization},
                    body: {
                        id: schemaId,
                        uuid: schemaUd,
                        description: "new",
                        hash: "",
                        status: "DRAFT",
                        readonly: false,
                        name: "test",
                        entity: "USER",
                        document:
                        {
                            $id: schemaUUID,
                            $comment:'{\"term\\": \"${schemaUUID}\\", \"@id\\": \"https://localhost/schema#${schemaUUID}\\"}',
                            title:"test",
                            description:" test",
                            type:"object",
                            properties:{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},
                            type:{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},
                            id:{"type":"string","readOnly":true},
                            field0:{"title":"test field","description":"test field","readOnly":false,"$comment":'{\\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\"}',"type":"string"}},
                            required:["@context","type"],
                            additionalProperties:false
                        },
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);

                    //Delete schema
                    cy.request({
                        method: METHOD.DELETE,
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
