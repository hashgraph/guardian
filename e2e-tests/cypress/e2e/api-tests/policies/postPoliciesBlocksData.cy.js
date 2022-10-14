context("Policies", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");



    before(() => {
        cy.request({
            method: "POST",
            url: `${Cypress.env("api_server")}policies/import/message`,
            body: { "messageId":"1650282926.728623821"},
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });
    });


    it("check returns of the blocks", () => {
        cy.request({
            method: "GET",
            url: Cypress.env("api_server") + "policies",
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body[0].id;
            const blockId = response.body[0].uuid;

            
            // cy.request({
            //     method: "POST",
            //     url:
            //         Cypress.env("api_server") +
            //         "policies/" +
            //         policyId +
            //         "/blocks/" +
            //         blockId,
            //     headers: {
            //         authorization,
            //     },
            //     body: {}
            // }).then((response) => {
            //     expect(response.status).to.eq(200);
            // });
        });
    });
});

