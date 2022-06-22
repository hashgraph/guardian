/// <reference types="cypress" />
import { policyId } from "../../../fixtures/policy.json";

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
          expect(response.status).to.eq(200)
          expect(response.body).to.not.be.oneOf([null, ""])
          expect(response.body.id).to.equal(policyId)
          })
    })
})
