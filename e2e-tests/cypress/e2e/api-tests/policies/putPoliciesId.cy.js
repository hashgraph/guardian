context("Policies", { tags: '@policies' }, () => {
    const authorization = Cypress.env("authorization");

    it("check returns of the policy", () => {
        const urlPolicies = {
            method: "GET",
            url: Cypress.env("api_server") + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-2).id;

            const urlPoliciesId = {
                method: "PUT",
                url: Cypress.env("api_server") + "policies/" + policyId,
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
            cy.request(urlPoliciesId).should((response) => {
                expect(response.status).to.eq(200);
             
                
            });
        });
    });
});
