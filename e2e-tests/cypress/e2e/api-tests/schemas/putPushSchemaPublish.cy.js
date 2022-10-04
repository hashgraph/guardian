import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");
    const schemaUUID = "0000b23a-b1ea-408f-a573-6d8bd1a2060a";

    it("should push to create new schema", () => {
        cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.Schemas, {
            authorization,
        }).then((resp) => {
            const topicUid = resp.body[0].topicId;
            //Create new schema
            cy.request({
                method: "POST",
                url: Cypress.env("api_server") + API.Schemas + topicUid,
                headers: { authorization },
                body: {
                    uuid: schemaUUID,
                    description: "new",
                    hash: "",
                    status: "DRAFT",
                    readonly: false,
                    name: "test",
                    entity: "NONE",
                    document:
                        '{"$id":"#${schemaUUID}","$comment":"{\\"term\\": \\"${schemaUUID}\\", \\"@id\\": \\"https://localhost/schema#${schemaUUID}\\"}","title":"test","description":" test","type":"object","properties":{"@context":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"type":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"readOnly":true},"id":{"type":"string","readOnly":true},"field0":{"title":"test field","description":"test field","readOnly":false,"$comment":"{\\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\"}","type":"string"}},"required":["@context","type"],"additionalProperties":false}',
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                let schemaUd = response.body.at(-1).uuid;
                expect(schemaUd).to.equal(schemaUUID);
                let schemaId = response.body.at(-1).id;

                const versionNum = ("1." + Math.floor(Math.random() * 999))
                //Publish schema
                cy.request({
                    method: "PUT",
                    url: Cypress.env("api_server") + API.Schemas + "push/" + schemaId + "/publish",
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
    
});
