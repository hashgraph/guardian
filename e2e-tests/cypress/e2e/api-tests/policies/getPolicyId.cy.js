import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Policies', { tags: '@policies' }, () => {
    const authorization = Cypress.env('authorization');

    it('Get policy configuration for the specified policy ID', () => {

      const urlPolicies = {
        method: "GET",
        url: API.ApiServer + "policies",
        headers: {
            authorization,
        },
    };

    cy.request(urlPolicies).then((response) => {
        expect(response.status).to.eq(200);
        const policyId = response.body.at(0).id;


      const urlPoliciesId = {
        method: 'GET',
        url: API.ApiServer + 'policies/' + policyId,
        headers: {
          authorization,
        }};
      cy.request(urlPoliciesId)
          .then((response) => {
          expect(response.status).to.eq(200)
          expect(response.body.id).to.equal(policyId)

          let children = response.body.config.children

          cy.writeFile('cypress/fixtures/policyTags.json',
              { id: children[0].id,
                tag: children[0].tag,
                blockType: children[0].blockType,
          });
        })
    })
})
})
