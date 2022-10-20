import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context("Policies", { tags: '@policies' }, () => {
    const authorization = Cypress.env("authorization");



    it("check returns of the policy", () => {
        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
        //     const policyId = response.body.at(-1).id;

        //     const urlPoliciesId = {
        //         method: "GET",
        //         url:
        //             API.ApiServer +
        //             "policies/" +
        //             policyId +
        //             "/groups",
        //         headers: {
        //             authorization,
        //         },
        //     };
        //     cy.request(urlPoliciesId).should((response) => {
        //         expect(response.status).to.eq(500);
        //     });
        });
    });
});
