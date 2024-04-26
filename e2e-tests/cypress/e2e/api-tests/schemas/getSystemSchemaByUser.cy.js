import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", { tags: '@schemas' },  () => {
    const authorization = Cypress.env("authorization");

    it("Get all system schemas by username", () => {
        const usernames = ["Installer", "StandartRegistry"];
        let randomUserName =
            usernames[Math.floor(Math.random() * usernames.length)];
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.SchemasSystem + randomUserName,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body[0]).to.have.property("uuid");
        });
    });
});
