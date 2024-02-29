import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context('Accounts', { tags: '@accounts' }, () => {
    const authorization = Cypress.env('authorization');

      // TODO:
      // Do sessions as a user
      it('get session as a StandardRegistry', () => {
        const options = {
          method: 'GET',
          url: (API.ApiServer + 'accounts/session'),
          headers: {
            authorization,
          }};
    
        cy.request(options)
          .should((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('id')
            expect(response.body).to.have.property('username', 'StandardRegistry')
            expect(response.body).to.have.property('password')
            expect(response.body).to.have.property('did')
            expect(response.body).to.have.property('walletToken')
            expect(response.body).to.have.property('hederaAccountId')
            expect(response.body).to.have.property('role')
          })
      })  

})