import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");

    it("import module ipfs", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage,
            headers: {
                authorization,
            },
            body: {
                "messageId": Cypress.env('module_for_import')
            },
            timeout: 180000
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.SUCCESS);
        });
    });
});
