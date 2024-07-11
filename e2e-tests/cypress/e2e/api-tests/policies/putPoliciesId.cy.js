import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Policies", { tags: ['policies', 'secondPool'] }, () => {
    const authorization = Cypress.env("authorization");

    it("Update policy configuration for the specified policy ID", () => {
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
                method: METHOD.PUT,
                url: API.ApiServer + "policies/" + policyId,
                headers: {
                    authorization,
                },
                body: {
                    id: policyId,
                    uuid: "string",
                    name: "string",
                    version: "string",
                    description: "string",
                    topicDescription: "string",
                    config: {},
                    status: "string",
                    owner: "string",
                    policyRoles: ["string"],
                    topicId: "string",
                    policyTag: "string",
                    policyTopics: [
                        {
                            name: "string",
                            description: "string",
                            type: "string",
                            static: true,
                        },
                    ],
                },
            };
            cy.request(urlPoliciesId).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
            });
        });
    });
});
