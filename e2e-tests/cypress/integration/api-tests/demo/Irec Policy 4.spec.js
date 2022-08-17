/// <reference types="cypress"/>

import { ids } from "../../../fixtures/hederaAccounts.json"

context('Demo workflow UI test', () => {

  it('checks Irec policy 4 workflow', () => {


    cy.viewport(1230, 800)

    cy.visit('http://localhost:3000/')

    //login by Standard Registry
    cy.get('#mat-input-0').type(Cypress.env('root_user'))
    cy.get('#mat-input-1').type('test')
    cy.get('[type="submit"]').click().then(() => {

      //check if setup for Standard Registry is finished
      cy.wait(4000)
      cy.get('body').then((body) => {
        if (body.find('h3').length) {

          //fill info for Standard Registry, if it wasn't done before
          cy.contains('geography').next().type('Geography Field')
          cy.contains('law').next().type('Law Field')
          cy.contains('tags').next().type('Tags Field')

          //get account id and account key from the file and put it in the settings
          for (let item of ids) {
            if (item.used === false) {
              let hederaCreds = item
              cy.wrap(hederaCreds).as('hederaCredsForStandardRegistry')
              cy.get('[formcontrolname="hederaAccountId"]').type(hederaCreds.hederaAccountId)
              cy.get('[formcontrolname="hederaAccountKey"]').type(hederaCreds.hederaAccountKey)
                .then(() => {
                  cy.readFile("cypress/fixtures/hederaAccounts.json").then((data) => {

                    //update info about used hedera credentials in the file
                    for (let item of data.ids) {
                      if (item.hederaAccountKey === hederaCreds.hederaAccountKey) {
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

          //Submit info about Standard Registry
          cy.contains('Connect').click()
          cy.intercept('/api/v1/profiles/StandardRegistry').as('waitForRegisterStandardRegistry')
          cy.wait('@waitForRegisterStandardRegistry', { timeout: 180000 }).then(() => {
            cy.contains('Policies').click()
          })
        }
      })
    })
    cy.contains('Policies').click()
    cy.contains('Import').click()

    //import policy
    cy.contains('Import from file').click().then(() => {
      cy.get('[type="file"]').selectFile('../Demo Artifacts/iRec Policy 4.policy', { force: true }).then(() => {
        cy.get('.g-dialog-actions-btn').click().then(() => {

          //wait until policy uploaded
          cy.intercept('/api/v1/policies?pageIndex=0&pageSize=100').as('waitForPoliciesList')
          cy.wait('@waitForPoliciesList', { timeout: 180000 }).then(() => {

            //get policy name
            cy.get('tbody>tr').eq('0')
              .find('td').eq('0')
              .within((firstCell) => {

                //publish uploaded policy
                cy.wrap(firstCell.text()).as('policyName').then(() => {
                  cy.get('@policyName').then((policyName) => {
                    cy.contains(policyName)
                      .parent()
                      .find('td').eq('7').click()
                  })
                })
              })
              .then(() => {
                cy.get('[data-placeholder="1.0.0"]').type('0.0.1').then(() => {
                  cy.contains('.mat-button-wrapper', 'Publish').click().then(() => {

                    //wait until policy published
                    cy.wait('@waitForPoliciesList', { timeout: 600000 }).then(() => {
                      cy.get('@policyName').then((policyName) => {
                        cy.contains(policyName).parent()
                          .find('td').eq('9')
                          .find('div>span').click({ force: true })
                          .then(() => {
                            cy.contains('Previous Version').parents('table')
                              .find('tr').eq('1')
                              .find('td').eq('2')
                              .find('span').invoke('text').as('policyId')
                          })
                      })
                      cy.contains(Cypress.env('root_user')).click().then(() => {
                        cy.contains('Log out').click({ force: true })
                      })
                    })
                  })
                })
              })
          })
        })
      })
    })

    cy.visit('http://localhost:3000/')

    //login by Installer
    cy.get('#mat-input-0').type(Cypress.env('installer_user'))
    cy.get('#mat-input-1').type('test')
    cy.get('[type="submit"]').click().then(() => {

      //check if setup for Installer is finished
      cy.wait(2000)
      cy.get('body').then((body) => {
        if (body.find('[role="combobox"]').length) {

          //fill info for Installer
          cy.get('[role="combobox"]').click().then(() => {
            cy.get('[role="option"]').click()
            cy.get('@hederaCredsForStandardRegistry').then((usedCreds) => {

              //get account id and account key from the file and put it in the settings
              for (let item of ids) {
                if ((item.used === false) && usedCreds.hederaAccountId !== item.hederaAccountId) {
                  let hederaCreds = item
                  cy.get('[formcontrolname="id"]').type(hederaCreds.hederaAccountId)
                  cy.get('[formcontrolname="key"]').type(hederaCreds.hederaAccountKey)
                    .then(() => {
                      cy.readFile("cypress/fixtures/hederaAccounts.json").then((data) => {

                        //update info about used hedera credentials in the file
                        for (let item of data.ids) {
                          if (item.hederaAccountKey === hederaCreds.hederaAccountKey) {
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
            cy.contains('Submit').click()
            cy.intercept('/api/v1/profiles/Installer').as('waitForRegisterInstaller')
            cy.wait('@waitForRegisterInstaller', { timeout: 180000 }).then(() => {
              cy.contains('Policies').click({ force: true })
            })
          })
        }
      })

      //select registrant role for the user and fill info about registrant
      cy.contains('Policies').click({ force: true })
      cy.get('@policyName').then((policyName) => {
        cy.contains(policyName).parent().get('td').eq('4').click()
        cy.get('[role="combobox"]').click()
        cy.contains('[role="option"]', 'Registrant').click()
        cy.get('[type="submit"]').click()
        cy.contains('Applicant Legal Name').next().type('DoomGuy')
        cy.contains('Organization Name').next().type('Men in black')
        cy.get('[type="submit"]').click()
        cy.contains('Submitted for Approval', { timeout: 180000 })

        //associate the user (Installer) with the provided Hedera token
        // it doesn't need to associate the user with token for Irec policy 4

        cy.contains('Profile').click()
        cy.contains('TOKENS', { timeout: 180000 }).click().then(() => {
          cy.get('@policyName').then((policyName) => {
            cy.contains(policyName).within(() => {
              cy.get('td').eq('0').find('dragonglass>a').invoke('text').as('tokenId')
              //       cy.get('td').eq('1').within(() => {
              //         cy.get('@tokenId').then((tokenId) => {
              //           cy.intercept('/api/v1/tokens/' + tokenId + '/associate').as('waitForAssociate')
              //           cy.get('div').eq('1').click()
            })
          })
        })
        //     }).then(() => {


        //       cy.wait('@waitForAssociate', { timeout: 180000 }).then(() => {
        cy.contains(Cypress.env('installer_user')).click().then(() => {
          cy.contains('Log out').click({ force: true })
          //  })
          //})
          // })
          // })
        })
      })
    })

    cy.visit('http://localhost:3000/')

    //login by Standard Registry
    cy.get('#mat-input-0').type(Cypress.env('root_user'))
    cy.get('#mat-input-1').type('test')
    cy.get('[type="submit"]').click().then(() => {

      //grant KYC for the Installer
      //it doesn't need to grant KYC for the Installer with Irec Policy 4

      //   cy.contains('Tokens').click()
      //   cy.get('@tokenId').then((tokenId) => {
      //     cy.contains(tokenId)
      //       .parents('tr')
      //       .find('td').eq('4')
      //       .find('a').click()
      //   })
      // })
      // cy.contains('Installer').parent().within(() => {
      //   cy.get('@tokenId').then((tokenId) => {
      //     let url = '/api/v1/tokens/' + tokenId + '/Installer/grantKyc'
      //     cy.intercept('PUT', url).as('waitForGrantKyc').then(() => {
      //       cy.get('td').eq('4').click()
      //         .then(() => {
      //           cy.wait('@waitForGrantKyc')
      //         })
      //     })
      //   })
      // }).then(() => {

      //approve documents from the Installer
      cy.contains('Policies').click()
      cy.get('@policyName').then((policyName) => {
        cy.contains(policyName)
          .parent()
          .find('td').eq('10')
          .find('div').click({ force: true })
          .then(() => {
            cy.get('@policyId').then((policyId) => {
              cy.intercept('/api/v1/policies/' + policyId + '/tag/approve_registrant_btn').as('waitForApprove').then(() => {
                cy.get('.btn-approve', { timeout: 15000 }).click()
                cy.wait('@waitForApprove', { timeout: 180000 }).then(() => {
                  cy.contains(Cypress.env('root_user')).click().then(() => {
                    cy.contains('Log out').click({ force: true })
                  })
                })
              })
            })
          })
      })
    })

    cy.visit('http://localhost:3000/')

    //login by Installer
    cy.get('#mat-input-0').type(Cypress.env('installer_user'))
    cy.get('#mat-input-1').type('test')
    cy.get('[type="submit"]').click().then(() => {
      cy.contains('Policies').click({ force: true })

      //create New Device
      cy.get('@policyName').then((policyName) => {
        cy.get('@policyId').then((policyId) => {
          cy.intercept('/api/v1/policies/' + policyId + '/tag/create_issue_request_form').as('waitForDevicesButton').then(() => {
            cy.contains(policyName)
              .parent()
              .find('td').eq('4').click().then(() => {
                cy.contains('Devices', { timeout: 180000 }).click()
                cy.wait('@waitForDevicesButton', { timeout: 180000 }).then(() => {
                  cy.contains('Create New Device').click()
                  cy.contains('Production Device Details').next().within(() => {
                    cy.contains('Device Name').next().type('Device number one')
                    cy.contains('Address').next().type('1007 Mountain Drive, Gotham')
                    cy.contains('Installed capacity (kW)').next().type('5')
                  })
                })
                cy.contains('.mat-button-wrapper', 'Ok').click()

                cy.wait('@waitForDevicesButton', { timeout: 180000 }).then(() => {
                  cy.contains(Cypress.env('installer_user')).click().then(() => {
                    cy.contains('Log out').click({ force: true })
                  })
                })
              })
          })
        })
      })
    })

    cy.visit('http://localhost:3000/')

    //login by Standard Registry
    cy.get('#mat-input-0').type(Cypress.env('root_user'))
    cy.get('#mat-input-1').type('test')
    cy.get('[type="submit"]').click().then(() => {

      //approve device from the Installer
      cy.contains('Policies').click()
      cy.get('@policyName').then((policyId) => {
        cy.contains(policyId)
          .parent()
          .find('td').eq('10')
          .find('div').click({ force: true })
          .then(() => {
            cy.get('@policyId').then((policyId) => {
              cy.contains('Devices').click()
              cy.intercept('/api/v1/policies/' + policyId + '/tag/approve_device_btn').as('waitForApprove').then(() => {
                cy.get('.btn-approve', { timeout: 15000 }).click()
                cy.wait('@waitForApprove', { timeout: 180000 }).then(() => {
                  cy.contains(Cypress.env('root_user')).click().then(() => {
                    cy.contains('Log out').click({ force: true })
                  })
                })
              })
            })
          })
      })
    })

    cy.visit('http://localhost:3000/')

    //login by Installer
    let capacity = '6'
    let startDate = Math.ceil(Math.random() * 10)
    let endDate = startDate + Math.ceil(Math.random() * 10)

    cy.get('#mat-input-0').type(Cypress.env('installer_user'))
    cy.get('#mat-input-1').type('test')
    cy.get('[type="submit"]').click().then(() => {
      cy.contains('Policies').click({ force: true })

      //create New Issue Request
      cy.get('@policyName').then((policyName) => {
        cy.get('@policyId').then((policy) => {
          cy.contains(policyName)
            .parent()
            .find('td').eq('4').click().then(() => {

              //for some reason test often fails here. Need to investigate in the future. 
              //Added 2 extra page changes and also added wait.
              cy.contains('Token History').click()
              cy.contains('Devices').click()
              cy.wait('@waitForDevicesButton', { timeout: 180000 }).then(() => {
                cy.wait(2000).then(() => {
                  cy.contains('Create Issue Request').click()
                  cy.contains('Production Period Start Date')
                  cy.contains('Production Period Start Date').next().find('[aria-label="Open calendar"]').click()
                  cy.get('[role="gridcell"]').within(() => {
                    cy.contains(startDate).click()
                  })
                  cy.contains('Total kWh Produced in this period').next().type(capacity)
                  cy.contains('Production Period End Date').next().find('[aria-label="Open calendar"]').click()
                  cy.get('[role="gridcell"]').within(() => {
                    cy.contains(' ' + endDate + ' ').click()
                  })
                  cy.get('[type="submit"]').click().then(() => {
                    cy.contains(Cypress.env('installer_user')).click().then(() => {
                      cy.contains('Log out').click({ force: true })
                    })
                  })
                })
              })
            })
        })
      })
    })

    cy.visit('http://localhost:3000/')

    //login by Standard Registry
    cy.get('#mat-input-0').type(Cypress.env('root_user'))
    cy.get('#mat-input-1').type('test')
    cy.get('[type="submit"]').click().then(() => {

      //approve new issue request from the Installer
      cy.contains('Policies').click()
      cy.get('@policyName').then((text) => {
        cy.contains(text)
          .parent()
          .find('td').eq('10')
          .find('div').click({ force: true })
          .then(() => {
            cy.get('@policyId').then((policy) => {
              cy.contains('Issue Requests', { timeout: 12000 }).click()
              cy.intercept('/api/v1/policies/' + policy + '/tag/approve_device_btn').as('waitForApprove').then(() => {
                cy.get('.btn-approve', { timeout: 15000 }).click()
                cy.wait('@waitForApprove', { timeout: 180000 })
              })
              cy.contains('Tokens').click()
              cy.get('@tokenId').then((text) => {
                cy.contains(text)
                  .parents('tr')
                  .find('td').eq('4')
                  .find('a').click()
              })
            })
            cy.contains('Installer').parent().within(() => {

              //waiting for tokens minting
              cy.wait(30000).then(() => {
                cy.contains('refresh').click().then(() => {
                  cy.wait(2000)
                  cy.get('td').eq('2').invoke('text').invoke('replaceAll', ' ', '').should('be.equal', capacity)
                })
              })
            })
            cy.contains('Policies').click()
            cy.get('@policyName').then((policyName) => {
              cy.contains(policyName)
                .parent()
                .find('td').eq('10')
                .find('div').click({ force: true })
                .then(() => {
                  cy.get('@tokenId').then((tokenId) => {
                    cy.contains('Token History').click()
                    cy.contains('View TrustChain', { timeout: 180000 }).click().then(() => {

                      //checking that all steps went good
                      cy.get('.vp-field').contains('Token').next().invoke('text').should('be.equal', tokenId)
                      cy.contains('Policy Name').next().invoke('text').should('be.equal', policyName.trim())
                      cy.contains('Account Creation').next().find('div').eq('1').should('contain', Cypress.env('root_user'))
                      cy.contains('Policy Created').next().find('div').eq('1').should('contain', Cypress.env('root_user'))
                      cy.contains('Application submitted to Issuer.').next().find('div').eq('1').should('contain', Cypress.env('installer_user'))
                      cy.contains('Application/KYC processed.').next().find('div').eq('1').should('contain', Cypress.env('root_user'))
                      cy.contains('Production Facility/Device registration').next().find('div').eq('1').should('contain', Cypress.env('installer_user'))
                      cy.contains('Device registration request processed.').next().find('div').eq('1').should('contain', Cypress.env('root_user'))
                      cy.contains('Registrant submitted Issue Request to Issuer.').next().find('div').eq('1').should('contain', Cypress.env('installer_user'))
                      cy.contains('Issue Request processed.').next().find('div').eq('1').should('contain', Cypress.env('root_user'))
                      cy.contains('Token[s] minted.').next().find('div').eq('1').should('contain', Cypress.env('root_user'))
                    })
                  })
                })
            })
          })
      })
    })
  })
})
