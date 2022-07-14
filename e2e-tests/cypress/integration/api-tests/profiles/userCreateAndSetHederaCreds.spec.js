/// <reference types="cypress" />

import { ids } from "../../../fixtures/hederaAccounts.json"
import { did } from "../../../fixtures/StandardRegistryData.json";

context('Profiles', () => {

  it('Register a new user, login with it and set hedera credentials for it', () => {
    const userPassword = 'test'
    const name = (Math.floor(Math.random() * 999) + 'testUser')
    const options = {
      method: 'POST',
      url: Cypress.env('api_server') + 'accounts/register',
      body: {
        username: name,
        password: userPassword,
        role: 'USER'
      }
    };
    cy.request(options)
      .then((response) => {
        let role = response.body.role
        let username = response.body.username

        expect(response.status).to.eq(201)
        expect(response.body).to.not.be.oneOf([null, ""])
        expect(username).to.equal(name)
        expect(role).to.equal('USER')
        
        cy.request({
          method: 'POST',
          url: Cypress.env('api_server') + 'accounts/login',
          body: {
            username: username,
            password: userPassword
          }
        })
          .then((response) => {
            //Searching for not used hedera credentials for new user

            for (let item of ids) {
              if (item.used === false) {
                let hederaCreds = item
                let accessToken = 'bearer ' + response.body.accessToken
                cy.request({
                  method: 'PUT',
                  url: Cypress.env('api_server') + 'profiles/' + username,
                  headers: {
                    authorization: accessToken
                  },
                  body: {
                    hederaAccountId: hederaCreds.hederaAccountId,
                    hederaAccountKey: hederaCreds.hederaAccountKey,
                    parent: did
                  },
                  timeout: 200000
                })
                  .then((response) => {
                    cy.readFile("cypress/fixtures/hederaAccounts.json").then((data) => {
                      //update info about used hedera credentials in the file
                      for (let item of data.ids) {
                        if (item.hederaAccountId === hederaCreds.hederaAccountId) {
                          item.used = true
                          break;
                        }
                      }
                      cy.writeFile("cypress/fixtures/hederaAccounts.json", JSON.stringify(data))
                    })
                  })
                break;
              }
            }
          })
      })
  })
})


