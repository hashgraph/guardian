import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";



context('Policy - Import',{ tags: '@policies' }, () => {
    const authorization = Cypress.env('authorization');

    it('Imports new policy and all associated artifacts from IPFS', () => {
        cy.request({
            method: 'POST',
            url: API.ApiServer + "policies/import/message",
            body: {"messageId": "1707125414.999819805"}, //iRec6
            headers: {
                authorization,
            },
            timeout: 180000
        })
            .then((response) => {
                expect(response.status).to.eq(201);
            })
    })

    it('Imports new policy and all associated artifacts from IPFS(wrong message id)', () => {
        cy.request({
            method: 'POST',
            url: API.ApiServer + "policies/import/message",
            body: {"messageId": "0000000000.000000000"},
            headers: {
                authorization,
            },
            failOnStatusCode: false,
            timeout: 180000
        })
            .then(response => {
                expect(response.status).eql(STATUS_CODE.ERROR);
            })
    })
})
