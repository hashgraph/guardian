
// import { ids } from "../../../fixtures/hederaAccounts.json"
// import { did } from "../../../fixtures/StandardRegistryData.json";
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context('Profiles', { tags: '@profiles' }, () => {

  it('Register a new user, login with it and set hedera credentials for it', () => {
    const userPassword = 'test'
    const name = (Math.floor(Math.random() * 999) + 'testUser')
    const options = {
      method: 'POST',
      url: API.ApiServer + 'accounts/register',
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
          url: API.ApiServer + 'accounts/login',
          body: {
            username: username,
            password: userPassword
          }
        })
          .then((response) => {
            expect(response.status).to.eq(200)
            //Searching for not used hedera credentials for new user

            // for (let item of ids) {
            //   if (item.used === false) {
            //     let hederaCreds = item
            //     let accessToken = 'bearer ' + response.body.accessToken
            //     cy.request({
            //       method: 'PUT',
            //       url: API.ApiServer + 'profiles/' + username,
            //       headers: {
            //         authorization: accessToken
            //       },
            //       body: {
            //         hederaAccountId: hederaCreds.hederaAccountId,
            //         hederaAccountKey: hederaCreds.hederaAccountKey,
            //         parent: did
            //       },
            //       timeout: 200000
            //     })
                  // .then((response) => {
                  //   cy.readFile("cypress/fixtures/hederaAccounts.json").then((data) => {
                  //     //update info about used hedera credentials in the file
                  //     for (let item of data.ids) {
                  //       if (item.hederaAccountId === hederaCreds.hederaAccountId) {
                  //         item.used = true
                  //         break;
                  //       }
                  //     }
                      // cy.writeFile("cypress/fixtures/hederaAccounts.json", JSON.stringify(data))
                //     })
                //   })
                // break;
            //   }
            // }
          })
      })
  })

  it('Should attempt to register a new user, login with it and set invalid hedera credentials for it', () => {
    const userPassword = 'testTest'
    const name = (Math.floor(Math.random() * 999) + 'testUser')
    const options = {
      method: 'POST',
      url: API.ApiServer + 'accounts/register',
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
          url: API.ApiServer + 'accounts/login',
          body: {
            username: username,
            password: userPassword
          }
        })
          .then((response) => {
            expect(response.status).to.eq(200)

          
            
                let accessToken = 'bearer ' + response.body.accessToken
                cy.request({
                  method: 'PUT',
                  url: API.ApiServer + 'profiles/' + username,
                  headers: {
                    authorization: accessToken
                  },
                  failOnStatusCode:false,
                  body: {
                    hederaAccountId: '0.0.00000001',
                    hederaAccountKey: '302e020100300506032b657004220420aaf0eac4a188e5d7eb3897866d2b33e51ab5d7e7bfc251d736f2037a4b2075',
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
                  .then((response) => {
                    expect(response.status).to.eq(500)
                  })
               
              
      
          })
      })
  })
})


