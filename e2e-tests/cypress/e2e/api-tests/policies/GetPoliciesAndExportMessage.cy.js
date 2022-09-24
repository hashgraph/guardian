context("Policies", () => {
    const authorization = Cypress.env("authorization");

    it("check returns of the blocks", () => {
        const urlPolicies = {
            method: "GET",
            url: Cypress.env("api_server") + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;
            const name = response.body.at(-1).name;
            const version = response.body.at(-1).version;
            const messageId = response.body.at(-1).messageId;
            const owner = response.body.at(-1).owner;
            const description = response.body.at(-1).description;
            const url = {
                method: "GET",
                url:
                    Cypress.env("api_server") +
                    "policies/" +
                    policyId +
                    "/export/message",
                headers: {
                    authorization,
                },
            };
            cy.request(url).should((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property("id", policyId);
                expect(response.body).to.have.property("name", name);
                expect(response.body).to.have.property(
                    "description",
                    description
                );
                expect(response.body).to.have.property("version", version);
                expect(response.body).to.have.property("messageId", messageId);
                expect(response.body).to.have.property("owner", owner);
            });
        });
    });
});
