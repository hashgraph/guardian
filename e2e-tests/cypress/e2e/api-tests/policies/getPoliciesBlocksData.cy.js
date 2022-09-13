/// <reference types="cypress" />

import { policyId, blockId } from "../../../fixtures/blockId.json";

context('Policies', () => {
  const authorization = Cypress.env('authorization');

  it('check returns of the blocks', () => {
    const url = {
      method: 'GET',
      url: Cypress.env('api_server') + 'policies/' + policyId + '/blocks/' + blockId,
      headers: {
        authorization,
      }
    };
    cy.request(url)
      .should((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.not.be.oneOf([null, ""])
      })
  })
})