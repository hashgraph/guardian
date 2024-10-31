import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    it("Get list of modules", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfAllModules,
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                if (response.body.length != 0) {
                    expect(response.body.at(-1)).to.have.property("_id");
                    expect(response.body.at(-1)).to.have.property("uuid");
                    expect(response.body.at(-1)).to.have.property("status");
                }
            });
        })
    });
});
