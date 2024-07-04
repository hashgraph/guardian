import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");
    const schemaUUID = ("0000b23a-b1ea-408f-a573" + Math.floor(Math.random() * 999999) + "a2060a");
    let topicUid;

    before(() => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas,
            headers: {
                authorization,
            },
        }).then((response) => {
            topicUid = response.body.at(-1).topicId;
            //Create new schema
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Schemas + topicUid,
                headers: {authorization},
                body: {
                    uuid: schemaUUID,
                    description: "new",
                    hash: "",
                    status: "DRAFT",
                    readonly: false,
                    name: "test",
                    entity: "NONE",
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
            });
        });
    });

    it("Updates the schema with the provided schema ID", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Schemas + topicUid,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            const schemaId = response.body.at(0).id;
            const schemaUUId = response.body.at(0).uuid;

            cy.request({
                method: METHOD.PUT,
                url: API.ApiServer + API.Schemas,
                headers: { authorization, schemaID: schemaId },
                body: {
                    id: schemaId,
                    uuid: schemaUUId,
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
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });
});
