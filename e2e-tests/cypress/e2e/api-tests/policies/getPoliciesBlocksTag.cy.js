context("Policies", () => {
    const authorization = Cypress.env("authorization");

    it("should sends data to the specified block.", () => {
        const urlPolicies = {
            method: "GET",
            url: Cypress.env("api_server") + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body[0].id;
            const tag = response.body[0].config.children[0].tag;

            const url = {
                method: "GET",
                url:
                    Cypress.env("api_server") +
                    "policies/" +
                    policyId +
                    "/tag/" +
                    tag + "/blocks",
                headers: {
                    authorization,
                },
            };
            cy.request(url).should((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });
});
