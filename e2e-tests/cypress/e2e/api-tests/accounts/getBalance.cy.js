import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Accounts', () => {
  const authorization = Cypress.env('authorization');

  it('Requests current Hedera account balance', () => {
    cy.sendRequest(METHOD.GET, API.Balance, {authorization,}).then((resp) => {
      expect(resp.status).eql(STATUS_CODE.OK);
      expect(resp.body).to.have.property('balance')
      expect(resp.body).to.have.property('unit')
      expect(resp.body).to.have.property('user')
    })
})
})