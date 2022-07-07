/// <reference types="cypress" />

import { policyId, description, messageId, name, owner, version } from "../../../fixtures/policy.json";

context('Policies', () => {
  const authorization = Cypress.env('authorization');

  it('check returns of the blocks', () => {
    const url = {
      method: 'GET',
      url: Cypress.env('api_server') + 'policies/' + policyId + '/export/message',
      headers: {
        authorization,
      }
    };
    cy.request(url)
      .should((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('id', policyId)
        expect(response.body).to.have.property('name', name)
        expect(response.body).to.have.property('description', description)
        expect(response.body).to.have.property('version', version)
        expect(response.body).to.have.property('messageId', messageId)
        expect(response.body).to.have.property('owner', owner)
      })
  })
})