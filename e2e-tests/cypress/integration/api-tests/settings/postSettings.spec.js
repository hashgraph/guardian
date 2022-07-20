/// <reference types="cypress"/>

context('Settings', () => {

  //Checking that file with access token is presented. If it isn't - creating it.
  before(() => {
    let username = 'StandardRegistry'
    cy.request({
      method: 'POST',
      url: Cypress.env('api_server') + 'accounts/login',
      body: {
        username: username,
        password: 'test'
      }
    }).as('requestToken')
      .then((response) => {
        const accessToken = 'bearer ' + response.body.accessToken
        //Checking if StandardRegisty already has hedera credentials
        cy.request({
          method: 'GET',
          url: Cypress.env('api_server') + 'profiles/' + username,
          headers: {
            authorization: accessToken
          }
        })
          .then((response) => {
            if (response.body.confirmed === false) {
              //If StandardRegistry doesn't have hedera credentials, creating them
              cy.request({
                method: 'PUT',
                url: Cypress.env('api_server') + 'profiles/' + username,
                headers: {
                  authorization: accessToken
                },
                body: {
                  hederaAccountId: '0.0.46804835',
                  hederaAccountKey: '302e020100300506032b657004220420aaf0eac4a188e5d7eb3897866d2b33e51ab5d7e7bfc251d736f2037a4b2075e8',
                  vcDocument: {
                    geography: 'testGeography',
                    law: 'testLaw',
                    tags: 'testTags',
                    type: 'StandardRegistry',
                    '@context': []
                  }
                },
                timeout: 200000
              })
                .then(() => {
                  //get info about StandardRegistry and put it in the file
                  cy.request({
                    method: 'GET',
                    url: Cypress.env('api_server') + 'profiles/' + username,
                    headers: {
                      authorization: accessToken
                    }
                  })
                    .then((response) => {
                      response.body.accessToken = accessToken
                      cy.writeFile("cypress/fixtures/StandardRegistryData.json", JSON.stringify(response.body))
                    })
                })
            }
            else {
              //if StandardRegistry already has hedera credentials, do not create hedera creds, 
              //just put info about StandardRegistry and accessToken in the file (just in case the file isn't presented)
              response.body.accessToken = accessToken
              cy.writeFile("cypress/fixtures/StandardRegistryData.json", JSON.stringify(response.body))
            }
          })
      })
  })

  it('sets settings for Standard Registry', () => {

    cy.get('@requestToken').then((response) => {
      const accessToken = 'bearer ' + response.body.accessToken
      cy.request({
        method: 'GET',
        url: Cypress.env('api_server') + 'settings',
        headers: {
          authorization: accessToken
        }
      })
        .then((response) => {

          let oldNftApiKey = response.body.nftApiKey
          let oldOperatorId = response.body.operatorId
          let oldOperatorKey = response.body.operatorKey

          cy.request({
            method: 'POST',
            url: Cypress.env('api_server') + 'settings',
            headers: {
              authorization: accessToken
            },
            body: {
              nftApiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEMxZGY5YTQyMjhjMEZENEMwQmIzN0Q4QTlCNGRhNzIxNmFBYzQyMEMiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1ODMxMjA3NTEyMywibmFtZSI6IlRlc3QifQ.0nnjEpX0U7O0j954WdNE4J48XV6zdJqOKLR8zv7xbYI',
              operatorId: '0.0.47715985',
              operatorKey: '302a300506032b65700321002040f5152b9a73d2035daca493755d42798f821f08e9ee00d98f8cfa5c0b2997'
            }
          })
            .then((response) => {
              cy.request({
                method: 'GET',
                url: Cypress.env('api_server') + 'settings',
                headers: {
                  authorization: accessToken
                }
              })
                .then((response) => {

                  let newNftApiKey = response.body.nftApiKey
                  let newOperatorId = response.body.operatorId
                  let newOperatorKey = response.body.operatorKey
                  
                  expect(newNftApiKey).to.not.equal(oldNftApiKey)
                  expect(newOperatorId).to.not.equal(oldOperatorId)
                  expect(newOperatorKey).to.not.equal(oldOperatorKey)
                })
            })
        })
    })
  })
})