import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Policies", { tags: '@policies' },() => {
    const authorization = Cypress.env("authorization");



    before(() => {
        cy.request({
            method: "POST",
            url: `${API.ApiServer}policies/import/message`,
            body: { messageId: (Cypress.env('irec_policy')) },
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });
    });


    it("Send data to the specified block", () => {
        cy.request({
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        }).then((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;
            const blockId = response.body.at(-1).uuid;

            cy.request({
                method: "POST",
                url:
                    API.ApiServer +
                    "policies/" +
                    policyId +
                    "/blocks/" +
                    blockId,
                headers: {
                    authorization,
                },
                body: {},
                timeout:180000
            }).then((response) => {
                expect(response.status).to.eq(200);
            });
        });
    });
});

