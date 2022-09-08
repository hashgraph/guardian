/// <reference types="cypress" />

context('Policies', () => {
  const authorization = Cypress.env('authorization');

  before(() => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('api_server')}policies/import/message`,
      body: { messageId: (Cypress.env('irec_policy')) },
      headers: {
        authorization,
      },
      timeout: 180000
    }).then(response => {
      let firstPolicyId = response.body.at(-1).id
      let firstPolicyStatus = response.body.at(-1).status
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

  it('check returns of all policies', () => {
    const urlPolicies = {
      method: 'GET',
      url: Cypress.env('api_server') + 'policies',
      headers: {
        authorization,
      }
    };

    cy.request(urlPolicies)
      .should((response) => {

        let createDate = response.body.at(-1).createDate
        let policyId = response.body.at(-1).id
        let policyUuid = response.body.at(-1).uuid
        let creator = response.body.at(-1).creator
        let description = response.body.at(-1).description
        let messageId = response.body.at(-1).messageId
        let name = response.body.at(-1).name
        let owner = response.body.at(-1).owner
        let policyTag = response.body.at(-1).policyTag
        let version = response.body.at(-1).version

        expect(response.status).to.eq(200)
        expect(response.body).to.not.be.oneOf([null, ""])
        expect(response.body.at(-1).id).to.equal(policyId)
        expect(response.body.at(-1).uuid).to.equal(policyUuid)
        cy.writeFile('cypress/fixtures/policy.json',
          {
            policyId: policyId,
            policyUuid: policyUuid,
            createDate: createDate,
            creator: creator,
            description: description,
            messageId: messageId,
            name: name,
            owner: owner,
            policyTag: policyTag,
            version: version
          })
      })
  })
})