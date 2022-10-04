import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("External", () => {
    const authorization = Cypress.env("authorization");

    it("shold sends data from an external source", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + "policies",
            headers: {
                authorization,
            },
        }).then((resp) => {
            const policyTag = resp.body[0].policyTag;
            const owner = resp.body[0].owner;

            cy.request({
                method: METHOD.POST,
                url: Cypress.env("api_server") + API.External,
                body: {
                    owner: owner,
                    policyTag: policyTag,
                    document: {},
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });
});
