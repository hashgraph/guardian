/// <reference types="cypress" />
import { policyId } from "../../../fixtures/policy.json";

context('Policies', () => {
  const authorization = Cypress.env('authorization');

  it('check returns of the blocks', () => {
    const url = {
      method: 'GET',
      url: Cypress.env('api_server') + 'policies/' + policyId + '/export/file',
      encoding: null,
      headers: {
        authorization
      }
    };
    cy.request(url).then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.not.be.oneOf([null, ""])
      let policy = Cypress.Blob.arrayBufferToBinaryString(response.body)
      cy.writeFile('cypress/fixtures/exportedPolicy.policy', policy, 'binary')
    })
  })
})