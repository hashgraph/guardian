import { STATUS_CODE, METHOD } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context("Tags", { tags: ['tags', 'thirdPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get a list of all published schemas", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            //get published tag schemas
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Tags + "schemas/" + "published",
                headers: {
                    authorization,
                },
                timeout: 200000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        })
    })
})
