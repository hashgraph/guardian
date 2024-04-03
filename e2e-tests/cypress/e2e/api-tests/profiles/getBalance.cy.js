import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Profiles', { tags: '@profiles' },() => {
    const authorization = Cypress.env('authorization');

    it('Get Hedera account balance', () => {
        const options = {
            method: 'GET',
            url: API.ApiServer + 'profiles/' + Cypress.env('root_user') + '/balance',
            headers: {
                authorization
            }
           };
        cy.request(options)
          .should((response) => {
            expect(response.status).to.eq(200)
        })
    })
})
