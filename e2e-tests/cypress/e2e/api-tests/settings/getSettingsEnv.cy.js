import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Settings", { tags: '@settings' }, () => {
    const authorization = Cypress.env("authorization");

    it("Returns current environment name.", () => {
        cy.request({
            method: METHOD.GET,
            url: Cypress.env("api_server") + API.SettingsEnv,
            headers: {
                authorization,
            },
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.OK);
            expect(resp.body).eql("testnet");
        });
    });
});
