
context('Policies', { tags: '@policies' },() => {
    const authorization = Cypress.env('authorization');

    it('check returns of the policy', () => {

      const urlPolicies = {
        method: "GET",
        url: Cypress.env("api_server") + "policies",
        headers: {
            authorization,
        },
    };

    cy.request(urlPolicies).should((response) => {
        expect(response.status).to.eq(200);
        const policyId = response.body[0].id;
        

      // const urlPoliciesId = {
      //   method: 'POST',
      //   url: Cypress.env('api_server') + 'policies/' + policyId + "/groups",
      //   body: {
      //       "uuid": "string"
      //   },
      //   headers: {
      //     authorization,
      //   }};
      // cy.request(urlPoliciesId)
      //     .should((response) => {
      //     expect(response.status).to.eq(200)
      //   })
    })
})
})