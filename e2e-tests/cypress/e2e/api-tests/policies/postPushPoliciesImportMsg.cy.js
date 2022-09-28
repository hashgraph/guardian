context("Policy - Import", () => {
    const authorization = Cypress.env("authorization");

    it("push should imports new policy and all associated artifacts from IPFS into the local DB", () => {
        cy.request({
            method: "POST",
            url: `${Cypress.env("api_server")}policies/push/import/message`,
            body: {  "messageId":"1650282926.728623821" },
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });
    });
});
