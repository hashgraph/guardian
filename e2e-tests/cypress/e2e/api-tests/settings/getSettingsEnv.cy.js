import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Settings", { tags: ['settings', 'thirdPool'] }, () => {
    const authorization = Cypress.env("authorization");

    it("Get current environment name", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.SettingsEnv,
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql("testnet");
        });
    });
});
