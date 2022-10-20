import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("External",  { tags: '@external' }, () => {
    const authorization = Cypress.env("authorization");


    before(() => {
        cy.request({
            method: "POST",
            url: `${API.ApiServer}policies/import/message`,
            body: { messageId: "1650282926.728623821" },
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);
        });
    });

    
    it("shold sends data from an external source", () => {
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        }).then((resp) => {
            const policyTag = resp.body[0].policyTag;
            const owner = resp.body[0].owner;

            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.External,
                body: {
                    owner: owner,
                    policyTag: policyTag,
                    document: {},
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });
});
