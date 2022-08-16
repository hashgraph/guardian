/// <reference types="cypress" />
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Tokens', () => {
  const authorization = Cypress.env('authorization');

  it('get all tokens', () => {
    cy.sendRequest(METHOD.GET, API.ListOfTokens, {authorization,}).then((resp) => {
      expect(resp.status).eql(STATUS_CODE.OK)
      expect(resp.body[0]).to.have.property('id')
      expect(resp.body[1]).to.have.property('tokenId')
      expect(resp.body[2]).to.have.property('tokenName')
    })
})
})
