import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context("Policies", { tags: '@policies' }, () => {
    const authorization = Cypress.env("authorization");



    it("Get a list of groups the user is a member of", () => {
        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;
            const urlPoliciesId = {
                method: "GET",
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
                expect(response.status).to.eq(200);
            });
        });
    });
});
