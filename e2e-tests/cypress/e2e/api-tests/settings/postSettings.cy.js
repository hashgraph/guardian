import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Settings', { tags: '@settings' },() => {

  //Checking that file with access token is presented. If it isn't - creating it.
  before(() => {
    let username = 'StandardRegistry'
    cy.request({
      method: 'POST',
      url:  API.ApiServer + 'accounts/login',
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
          url:  API.ApiServer + 'profiles/' + username,
          headers: {
            authorization: accessToken
          }
        })
          .then((response) => {
            if (response.body.confirmed === false) {
              //If StandardRegistry doesn't have hedera credentials, creating them
              cy.request({
                method: 'PUT',
                url:  API.ApiServer + 'profiles/' + username,
                headers: {
                  authorization: accessToken
                },
                body: {
                  hederaAccountId: '0.0.6263',
                  hederaAccountKey: 'ece9aa76a655744f8657a8c376537b46b799d23247a1f2330f6b4b61a6e66f8d',
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
                    url: API.ApiServer + 'profiles/' + username,
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
        url:  API.ApiServer + 'settings',
        headers: {
          authorization: accessToken
        }
      })
        .then((response) => {

          let oldNftApiKey = response.body.nftApiKey
          let oldOperatorKey = response.body.operatorKey

          cy.request({
            method: 'POST',
            url:  API.ApiServer + 'settings',
            headers: {
              authorization: accessToken
            },
            body: {
              nftApiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEMxZGY5YTQyMjhjMEZENEMwQmIzN0Q4QTlCNGRhNzIxNmFBYzQyMEMiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY1ODMxMjA3NTEyMywibmFtZSI6IlRlc3QifQ.0nnjEpX0U7O0j954WdNE4J48XV6zdJqOKLR8zv7xbYI',
              operatorId: '0.0.19310',
              operatorKey: '2509bda584e8c8c0f57f3abb49e3789bce04377a56222177fee725fb8007fcb0'
            }
          })
            .then((response) => {
              cy.request({
                method: 'GET',
                url:  API.ApiServer + 'settings',
                headers: {
                  authorization: accessToken
                }
              })
                .then((response) => {

                  let newNftApiKey = response.body.nftApiKey
                  let newOperatorKey = response.body.operatorKey
                  
                  expect(newNftApiKey).to.equal(oldNftApiKey)
                  expect(newOperatorKey).to.equal(oldOperatorKey)
                })
            })
        })
    })
  })
})