import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";


context('Settings', { tags: ['settings', 'thirdPool'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    it('Get current settings', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'settings',
                headers: {
                    authorization,
                },
            })
                .then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK)
                    expect(response.body).to.have.property('ipfsStorageApiKey')
                    expect(response.body).to.have.property('operatorId')
                    expect(response.body).to.have.property('operatorKey')
                })
        })
    })
})
