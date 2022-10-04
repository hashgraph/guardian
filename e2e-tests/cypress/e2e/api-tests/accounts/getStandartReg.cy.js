import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Accounts', () => {
  const authorization = Cypress.env('authorization');

  it('Returns all Standard Registries', () => {
    cy.sendRequest(METHOD.GET, Cypress.env("api_server") + API.StandartRegistries, {authorization,}).then((resp) => {
      expect(resp.status).eql(STATUS_CODE.OK);
      expect(
        resp.body[0]).to.have.property('username')
    })
})
})