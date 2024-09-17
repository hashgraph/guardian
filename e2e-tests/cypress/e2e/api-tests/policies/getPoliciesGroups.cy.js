import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it("Get a list of groups the user is a member of", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            const urlPolicies = {
                method: METHOD.GET,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
            };

            cy.request(urlPolicies).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                const policyId = response.body.at(-1).id;
                const urlPoliciesId = {
                    method: METHOD.GET,
                    url:
                        API.ApiServer +
                        "policies/" +
                        policyId +
                        "/groups",
                    headers: {
                        authorization,
                    },
                    timeout: 180000
                };
                cy.request(urlPoliciesId).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                });
            })
        });
    });
});
