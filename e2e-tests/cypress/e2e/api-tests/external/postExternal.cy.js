import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("External", { tags: '@external' }, () => {

    const authorization = Cypress.env("authorization");
    let policyTag, owner

    before(() => {

        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.PolicisImportMsg,
            body: { messageId: (Cypress.env('irec_policy')) }, //iRec3
            headers: {
                authorization,
            },
            timeout: 240000,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
        });

        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies,
            headers: {
                authorization,
            },
        }).then((response) => {
            policyTag = response.body[0].policyTag;
            owner = response.body[0].owner;
        })
        
    });

    it("Sends data from an external source", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.External,
            body: {
                owner: owner,
                policyTag: policyTag,
                document: {},
            },
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.OK);
            expect(response.body).eql(true);
        });
    });
});
