import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Profiles', { tags: '@profiles' },() => {

  it('Get Bearer token and set hedera credentials for StandardRegistry', () => {
    //Getting accessToken for StandardRegistry
    let username = 'StandardRegistry'
    cy.request({
      method: 'POST',
      url: API.ApiServer + 'accounts/login',
      body: {
        username: username,
        password: 'test'
      }
    })
      .then((response) => {
        let accessToken = 'bearer ' + response.body.accessToken
        //Checking if StandardRegisty already has hedera credentials
        cy.request({
          method: 'GET',
          url: API.ApiServer + 'profiles/' + username,
          headers: {
            authorization: accessToken
          }
        })
          .then((response) => {
            if (response.body.confirmed === false) {
              //If StandardRegistry doesn't have hedera credentials, creating them
              cy.request({
                method: 'PUT',
                url: API.ApiServer + 'profiles/' + username,
                headers: {
                  authorization: accessToken
                },
                body: {
                  hederaAccountId: '0.0.3763210',
                  hederaAccountKey: '302e020100300506032b657004220420a11e17f31581cecd57858121865fa51c965a3f8491f29f523f6161188e6a8921',
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
})

