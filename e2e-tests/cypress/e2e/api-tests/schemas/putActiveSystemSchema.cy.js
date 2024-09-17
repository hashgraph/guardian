import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const username = "StandartRegistry";
    const schemaUUID = ("0000b23a-b1ea-408f-a573" + Math.floor(Math.random() * 999999) + "a2060a")

    it("Make the created scheme active", () => {
        //Create new schema
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.SchemasSystem + username,
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
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.SchemasSystem + username,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body[0]).to.have.property("uuid");

                    let schemaId = response.body.at(0).id;

                    const versionNum = "1." + Math.floor(Math.random() * 999);

                    cy.request({
                        method: METHOD.PUT,
                        url:
                            API.ApiServer +
                            API.SchemasSystem +
                            schemaId +
                            "/active",
                        headers: { authorization },
                        body: {
                            version: versionNum,
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
            });
        });
    })
});
