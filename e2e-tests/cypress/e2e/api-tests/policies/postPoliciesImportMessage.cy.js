import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context('Policies', { tags: ['policies', 'secondPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Imports new policy and all associated artifacts from IPFS', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: 'POST',
                url: API.ApiServer + "policies/import/message",
                body: { "messageId": "1707125414.999819805" }, //iRec6
                headers: {
                    authorization,
                },
                timeout: 180000
            })
                .then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                })
        })
    })

    it('Imports new policy and all associated artifacts from IPFS(wrong message id)', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: 'POST',
                url: API.ApiServer + "policies/import/message",
                body: { "messageId": "0000000000.000000000" },
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
})
