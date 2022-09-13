import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");
    const schemaUUID = "1111b23a-b1ea-408f-a573-6d8bd1a2060a";
    const username = "StandartRegistry";

    it("manage new schema", () => {
        //Create new schema
        cy.request({
            method: "POST",
            url: API.SchemasSystem + username,
            headers: { authorization },
            body: {
                uuid: schemaUUID,
                description: "new",
                hash: "",
                status: "DRAFT",
                readonly: false,
                name: "test",
                entity: "USER",
                document:
                    '{"$id":"#${schemaUUID}","$comment":"{\\"term\\": \\"${schemaUUID}\\", \\"@id\\": \\"https://localhost/schema#${schemaUUID}\\"}","title":"test","description":" test","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"test field","description":"test field","readOnly":false,"$comment":"{\\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\"}","type":"string"}},"required":["@context","type"],"additionalProperties":false}',
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.SUCCESS);

            cy.sendRequest(METHOD.GET, API.SchemasSystem + username, {
                authorization,
            }).then((resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
                expect(resp.body[0]).to.have.property("uuid");

                let schemaUd = resp.body.at(-1).uuid;
                expect(schemaUd).to.equal(schemaUUID);
                let schemaId = resp.body.at(-1).id;

                cy.request({
                    method: "PUT",
                    url: API.SchemasSystem + schemaId,
                    headers: { authorization },
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
                            '{"$id":"#${schemaUUID}","$comment":"{\\"term\\": \\"${schemaUUID}\\", \\"@id\\": \\"https://localhost/schema#${schemaUUID}\\"}","title":"test","description":" test","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"test field","description":"test field","readOnly":false,"$comment":"{\\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\"}","type":"string"}},"required":["@context","type"],"additionalProperties":false}',
                    },
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);

                    //Delete schema
                    cy.request({
                        method: "DELETE",
                        url: API.SchemasSystem + schemaId,
                        headers: { authorization },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
            });
        });
    });
});
