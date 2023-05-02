import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");

    it("import policy", () => {
        cy.fixture("module_1682969031678.module", "binary").then((binary) => Cypress.Blob.binaryStringToBlob(binary))
            .then((file) => {
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.ListOfAllModules + API.ImportFile + "preview",
                    body: file,
                    headers: {
                        "content-type": "binary/octet-stream",
                        authorization,
                    },
                    timeout: 180000,
                }).then((resp) => {
                    expect(resp.status).eql(STATUS_CODE.OK);
                });
            });
    });
});
