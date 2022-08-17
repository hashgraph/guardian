  /// <reference types="cypress"/>

  import { ids } from "../../../fixtures/hederaAccounts.json"

  context('Demo workflow UI test', () => {

    it('checks Irec policy 1 workflow', () => {


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
        cy.get('[type="file"]').selectFile('../Demo Artifacts/iRec Policy.policy', { force: true }).then(() => {
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

        //select installer role for the user and fill info about installer
        cy.contains('Policies').click({ force: true })
        cy.get('@policyName').then((policyName) => {
          cy.contains(policyName).parent().get('td').eq('4').click()
          cy.get('[role="combobox"]').click()
          cy.contains('[role="option"]', 'INSTALLER').click()
          cy.get('[type="submit"]').click()
          cy.contains('Applicant legal name').next().type('Agent Smith')
          cy.get('[type="submit"]').click()

          //associate the user (Installer) with the provided Hedera token
          cy.contains('Profile').click()
          cy.contains('TOKENS', { timeout: 180000 }).click().then(() => {
            cy.get('@policyName').then((policyName) => {
              cy.contains(policyName).within(() => {
                cy.get('td').eq('0').find('dragonglass>a').invoke('text').as('tokenId')
                cy.get('td').eq('1').within(() => {
                  cy.get('@tokenId').then((tokenId) => {
                    cy.intercept('/api/v1/tokens/' + tokenId + '/associate').as('waitForAccociate')
                    cy.get('div').eq('1').click()
                  })
                })
              }).then(() => {


                cy.wait('@waitForAccociate', { timeout: 180000 }).then(() => {
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

        //grant KYC for the Installer
        cy.contains('Tokens').click()
        cy.get('@tokenId').then((tokenId) => {
          cy.contains(tokenId)
            .parents('tr')
            .find('td').eq('4')
            .find('a').click()
        })
      })
      cy.contains('Installer').parent().within(() => {
        cy.get('@tokenId').then((tokenId) => {
          let url = '/api/v1/tokens/' + tokenId + '/Installer/grantKyc'
          cy.intercept('PUT', url).as('waitForGrantKyc').then(() => {
            cy.get('td').eq('4').click()
              .then(() => {
                cy.wait('@waitForGrantKyc')
              })
          })
        })
      }).then(() => {

        //approve documents from the Installer
        cy.contains('Policies').click()
        cy.get('@policyName').then((policyName) => {
          cy.contains(policyName)
            .parent()
            .find('td').eq('10')
            .find('div').click({ force: true })
            .then(() => {
              cy.get('@policyId').then((policyId) => {
                cy.intercept('/api/v1/policies/' + policyId + '/tag/approve_documents_btn').as('waitForApprove').then(() => {
                  cy.get('.btn-approve').click()
                  cy.wait('@waitForApprove', { timeout: 180000 })
                })
              })
            })
          cy.contains(Cypress.env('root_user')).click().then(() => {
            cy.contains('Log out').click({ force: true })
          })
        })
      })

      cy.visit('http://localhost:3000/')

      //login by Installer
      cy.get('#mat-input-0').type(Cypress.env('installer_user'))
      cy.get('#mat-input-1').type('test')
      cy.get('[type="submit"]').click().then(() => {
        cy.contains('Policies').click({ force: true })

        //create New Sensors
        cy.get('@policyName').then((policyName) => {
          cy.get('@policyId').then((policyId) => {
            cy.intercept('/api/v1/policies/' + policyId + '/tag/download_config_btn').as('waitForSensorsButton').then(() => {
              cy.contains(policyName)
                .parent()
                .find('td').eq('4').click()
              cy.wait('@waitForSensorsButton', { timeout: 180000 }).then(() => {
                cy.contains('New Sensors').click()
                cy.contains('projectId').next().type('Some project id')
                cy.contains('projectName').next().type('Project name')
                cy.contains('sensorType').next().type('type of sensor')
                cy.contains('capacity').next().type('3')

                //download config
                cy.intercept('/api/v1/profiles/Installer').as('waitForDownloadConfig').then(() => {
                  cy.contains('.mat-button-wrapper', 'Ok').click()
                  cy.wait('@waitForDownloadConfig', { timeout: 180000 }).then(() => {
                    cy.contains('did:hedera:').invoke('text').invoke('replaceAll', ':', '_').invoke('replaceAll', ' ', '').as('fileName')
                    cy.contains('download').click()
                  })
                })
                cy.contains(Cypress.env('installer_user')).click().then(() => {
                  cy.contains('Log out').click({ force: true })
                })
              })
            })
          })
        })
      })

      cy.visit('http://localhost:3000/mrv-sender/')

      //upload config  and start token minting
      cy.get('@fileName').then((fileName) => {
        cy.get('[type="file"]').selectFile('cypress/downloads/' + fileName + '.config.json.config', { force: true }).then(() => {
          cy.get('[type="checkbox"]').click({ multiple: true })
          cy.get('.btn-ok').click().then(() => {
            cy.get('.config-control-start').click()
          })
        })
      })

      cy.visit('http://localhost:3000/')

      //login by Standard Registry and check that tokens are successfully minting
      cy.get('#mat-input-0').type(Cypress.env('root_user'))
      cy.get('#mat-input-1').type('test')
      cy.get('[type="submit"]').click().then(() => {
        cy.contains('Tokens').click()
        cy.get('@tokenId').then((tokenId) => {
          cy.contains(tokenId)
            .parents('tr')
            .find('td').eq('4')
            .find('a').click()
        })
      })
      cy.contains('Installer').parent().within(() => {
        cy.wait(20000).then(() => {
          cy.contains('refresh').click()
          cy.get('td').eq('2').invoke('text').should('be.equal', ' 1 ')
        })
      })
    })
  })
