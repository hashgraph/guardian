import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("IPFS", () => {
    const authorization = Cypress.env("authorization");

    it("import the schema file", () => {
        cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.Schemas, {
            authorization,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            let schemaId = response.body[0].id;

            cy.request({
                method: METHOD.GET,
                url: Cypress.env("api_server") + API.Schemas + schemaId + "/export/file",
                encoding: null,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(200);
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

    // it("import the schema file", () => {
    //     cy.fixture("exportedSchema.schema", "binary")
    //         .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
    //         .then((file) => {
    //             cy.request({
    //                 method: METHOD.POST,
    //                 url: Cypress.env("api_server") + API.IPFSFile,
    //                 body: file,
    //                 headers: {
    //                     "content-type": "binary/octet-stream",
    //                     authorization,
    //                 },
    //                 timeout: 200000
    //             }).then((response) => {
    //                 expect(response.status).eql(STATUS_CODE.SUCCESS);
    //             });
    //         });
    // });
});
