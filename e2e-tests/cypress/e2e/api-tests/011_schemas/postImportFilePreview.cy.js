import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Schemas", { tags: ['schema', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Preview the schema from a file", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture("exportedSchema.schema", "binary")
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => {
                    cy.request({
                        method: METHOD.POST,
                        url:
                            API.ApiServer + API.SchemaImportFilePreview,
                        body: file,
                        headers: {
                            "content-type": "binary/octet-stream",
                            authorization,
                        },
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
        });
    })
});
