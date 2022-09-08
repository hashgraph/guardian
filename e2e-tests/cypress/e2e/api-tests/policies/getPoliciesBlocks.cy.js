/// <reference types="cypress" />

import { policyId, policyUuid } from "../../../fixtures/policy.json";

context('Policies', () => {
    const authorization = Cypress.env('authorization');

    it('check returns of the blocks', () => {
      const url = {
        method: 'GET',
        url: Cypress.env('api_server') + 'policies/' + policyId + '/blocks',
        headers: {
          authorization,
        }};
      cy.request(url)
          .should((response) => {
          let blockId = response.body.blocks.at(-1).id
          expect(response.status).to.eq(200)
          expect(response.body).to.not.be.oneOf([null, ""])
          //Wrong check. Response.body.id - is block id, not policy id.
          //expect(response.body.id).to.equal(policyId)
          cy.writeFile('cypress/fixtures/blockId.json', { policyId: policyId, policyUuid: policyUuid, blockId: blockId})
          })
    })
})