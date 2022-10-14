import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@schemas' },  () => {
    const authorization = Cypress.env("authorization");

    it("get all system schemas by username", () => {
        const usernames = ["Installer", "StandartRegistry"];
        let randomUserName =
            usernames[Math.floor(Math.random() * usernames.length)];
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.SchemasSystem + randomUserName,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body[0]).to.have.property("uuid");
        });
    });
});
