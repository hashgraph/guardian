import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.sendRequest(METHOD.GET, API.Schemas, {
            authorization,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            let schemaId = response.body[0].id;
            cy.request({
                method: METHOD.GET,
                url: API.Schemas + schemaId + "/export/file",
                encoding: null,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.not.be.oneOf([null, ""]);
                let schema = Cypress.Blob.arrayBufferToBinaryString(
                    response.body
                );
                cy.writeFile(
                    "cypress/fixtures/exportedSchema.schema",
                    schema,
                    "binary"
                );
            });
        });
    });

    it("should push import the schema file", () => {
        cy.sendRequest(METHOD.GET, API.Schemas, { authorization }).then(
            (resp) => {
                const topicUid = resp.body[0].topicId;

                cy.fixture("exportedSchema.schema", "binary")
                    .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                    .then((file) => {
                        cy.request({
                            method: METHOD.POST,
                            url: API.Schemas + "push/"+ topicUid + "/import/file",
                            body: file,
                            headers: {
                                "content-type": "binary/octet-stream",
                                authorization,
                            },
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.SUCCESS);
                            expect(response.body).to.not.be.oneOf([null, ""])
                        });
                    });
            }
        );
    });
});
