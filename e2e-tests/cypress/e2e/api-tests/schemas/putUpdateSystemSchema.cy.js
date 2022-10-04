import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("update schema by schemaId", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.Schemas,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            const schemaId = resp.body.at(-1).id;
            const schemaUUId = resp.body.at(-1).uuid;

            cy.request({
                method: "GET",
                url: Cypress.env("api_server") + API.SchemasSystem + schemaId,
                headers: { authorization },
                body: {
                    id: schemaId,
                    uuid: schemaUUId,
                    description: "new",
                    hash: "",
                    name: "test",
                    entity: "USER",
                    document:
                        '{"$id":"#${schemaUUID}","$comment":"{\\"term\\": \\"${schemaUUID}\\", \\"@id\\": \\"https://localhost/schema#${schemaUUID}\\"}","title":"test","description":" test","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"test field","description":"test field","readOnly":false,"$comment":"{\\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\"}","type":"string"}},"required":["@context","type"],"additionalProperties":false}',
                },
            }).then((resp) => {
                expect(resp.status).eql(STATUS_CODE.OK);
            });
        });
    });
});
