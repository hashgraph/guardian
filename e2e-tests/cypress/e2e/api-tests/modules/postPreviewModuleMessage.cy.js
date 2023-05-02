import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Modules", { tags: '@modules' },() => {
    const authorization = Cypress.env("authorization");

    it("import policy", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ListOfAllModules + API.ImportMessage + "preview",
            headers: {
                authorization,
            },
            body: {
                "messageId": "1682968868.704077548"
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body.module).to.have.property("name");
            expect(resp.body.module).to.have.property("description");
        });
    });
});
