/// <reference types="cypress" />
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Accounts', () => {
  const authorization = Cypress.env('authorization');

  // TODO:
  // Negative scenario to get accounts as non RootAuthority
  it('get all users as a StandardRegistry', () => {
    cy.sendRequest(METHOD.GET, API.Accounts, {authorization,}).then((resp) => {
      expect(resp.status).eql(STATUS_CODE.OK);
      expect(
        resp.body[0]).to.have.property('username')
    })
})
})