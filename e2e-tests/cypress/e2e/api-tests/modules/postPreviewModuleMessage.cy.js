import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");

    it("Preview the module from IPFS", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage + "preview",
            headers: {
                authorization,
            },
            body: {
                "messageId": Cypress.env('module_for_import')
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body.module).to.have.property("name");
            expect(resp.body.module).to.have.property("description");
        });
    });
});
