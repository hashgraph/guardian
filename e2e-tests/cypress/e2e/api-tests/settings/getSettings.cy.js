import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Settings',{ tags: '@settings' },  () => {
    const authorization = Cypress.env("authorization");
    it('Get current settings', () => {
        cy.request({
            method: 'GET',
            url: API.ApiServer + 'settings',
            headers: {
                authorization,
            },
        })
            .then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('ipfsStorageApiKey')
                expect(response.body).to.have.property('operatorId')
                expect(response.body).to.have.property('operatorKey')
            })
    })
})
