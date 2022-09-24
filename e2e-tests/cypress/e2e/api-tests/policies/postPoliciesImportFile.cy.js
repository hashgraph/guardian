
context('Policies', () => {
  const authorization = Cypress.env('authorization');

  before(() => {

    const urlPolicies = {
      method: "GET",
      url: Cypress.env("api_server") + "policies",
      headers: {
          authorization,
      },
  };

  cy.request(urlPolicies).should((response) => {
      expect(response.status).to.eq(200);
      const policyId = response.body.at(-1).id;

    const url = {
      method: 'GET',
      url: Cypress.env('api_server') + 'policies/' + policyId + '/export/file',
      encoding: null,
      headers: {
        authorization
      }
    }
    cy.request(url).then((response) => {
      let policy = Cypress.Blob.arrayBufferToBinaryString(response.body)
      cy.writeFile('cypress/fixtures/exportedPolicy.policy', policy, 'binary')
    })
  })
})


  it('check returns of all policies', () => {
    cy.fixture('exportedPolicy.policy', 'binary').then((binary) => Cypress.Blob.binaryStringToBlob(binary))
      .then((file) => {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('api_server')}policies/import/file`,
          body: file,
          headers: {
            'content-type': 'binary/octet-stream',
            authorization
          },
          timeout: 180000
        })
          .then(response => {
            let responseTextJSon = JSON.parse(Cypress.Blob.arrayBufferToBinaryString(response.body))
            let firstPolicyId = responseTextJSon.at(-1).id
            let firstPolicyStatus = responseTextJSon.at(-1).status
            expect(firstPolicyStatus).to.equal('DRAFT')
            cy.request({
              method: 'PUT',
              url: Cypress.env('api_server') + 'policies/' + firstPolicyId + '/publish',
              body: { policyVersion: "1.2.5" },
              headers: { authorization },
              timeout: 600000
            })
              .should((response) => {
                let secondPolicyId = response.body.policies.at(-1).id
                let policyStatus = response.body.policies.at(-1).status
                expect(response.status).to.eq(200)
                expect(response.body).to.not.be.oneOf([null, ""])
                expect(firstPolicyId).to.equal(secondPolicyId)
                expect(policyStatus).to.equal('PUBLISH')
              })
          })
      })
  })
})