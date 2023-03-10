import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Policies", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");



    before(() => {
        cy.request({
            method: "POST",
            url: `${API.ApiServer}policies/import/message`,
            body: { "messageId":"1678448809.058329933"}, //iRec4
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
            url: API.ApiServer + "policies",
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
            //         API.ApiServer +
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

