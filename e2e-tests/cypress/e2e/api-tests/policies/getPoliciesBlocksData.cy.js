import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context("Policies",{ tags: '@policies' }, () => {
    const authorization = Cypress.env("authorization");

    before(() => {
        cy.request({
            method: "POST",
            url: `${API.ApiServer}policies/import/message`,
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
        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;
            const blockId = response.body.at(-1).uuid;

            // cy.request;
            // const url = {
            //     method: "GET",
            //     url:
            //         API.ApiServer +
            //         "policies/" +
            //         policyId +
            //         "/blocks/" +
            //         blockId,
            //     headers: {
            //         authorization,
            //     },
            // };
            // cy.request(url).should((response) => {
            //     expect(response.status).to.eq(200);
            // });
        });
    });
});
