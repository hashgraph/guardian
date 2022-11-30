import { HomePage } from "../../pages/homepage";
import { PoliciesPage } from "../../pages/policies";
import { InstallerPage } from "../../pages/intaller-page";
import API from "../../../../support/ApiUrls";

const home = new HomePage();
const policies = new PoliciesPage();
const installer = new InstallerPage();

describe("Import and publish irec policy", () => {
  const authorization = Cypress.env("authorization");

    before("Loads the home page", () => {
        const urlPolicies = {
            method: "GET",
            url: API.ApiServer + "policies",
            headers: {
                authorization,
            },
        };

        cy.request(urlPolicies).should((response) => {
            expect(response.status).to.eq(200);
            const policyId = response.body.at(-1).id;

            const url = {
                method: "GET",
                url:
                    Cypress.env("api_server") +
                    "policies/" +
                    policyId +
                    "/export/file",
                encoding: null,
                headers: {
                    authorization,
                },
            };
            cy.request(url).then((response) => {
                let policy = Cypress.Blob.arrayBufferToBinaryString(
                    response.body
                );
                cy.writeFile(
                    "cypress/fixtures/ui.policy",
                    policy,
                    "binary"
                );
            });
        });

        cy.viewport(1230, 800);
        home.visit();
    });

    it("checks Irec policy 1 workflow", () => {
        home.loginAsStandartRegistry();
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyFile("ui.policy");
        policies.publishPolicy();
        home.logoutAsStandartRegistry();

        //    //login by Installer
        home.loginAsInstaller();
        home.checkSetupInstaller();
        // installer.fillInfoInstaller();



        //    cy.get('[type="submit"]').click().then(() => {


        //      //select installer role for the user and fill info about installer
        //      cy.contains('Policies').click({ force: true })
        //      cy.get('@policyName').then((policyName) => {
        //        cy.contains(policyName).parent().get('td').eq('4').click()
        //        cy.get('[role="combobox"]').click()
        //        cy.contains('[role="option"]', 'INSTALLER').click()
        //        cy.get('[type="submit"]').click()
        //        cy.contains('Applicant legal name').next().type('Agent Smith')
        //        cy.get('[type="submit"]').click()

        //        //associate the user (Installer) with the provided Hedera token
        //        cy.contains('Profile').click()
        //        cy.contains('TOKENS', { timeout: 180000 }).click().then(() => {
        //          cy.get('@policyName').then((policyName) => {
        //            cy.contains(policyName).within(() => {
        //              cy.get('td').eq('0').find('dragonglass>a').invoke('text').as('tokenId')
        //              cy.get('td').eq('1').within(() => {
        //                cy.get('@tokenId').then((tokenId) => {
        //                  cy.intercept('/api/v1/tokens/' + tokenId + '/associate').as('waitForAccociate')
        //                  cy.get('div').eq('1').click()
        //                })
        //              })
        //            }).then(() => {

        //              cy.wait('@waitForAccociate', { timeout: 180000 }).then(() => {
        //                cy.contains(Cypress.env('installer_user')).click().then(() => {
        //                  cy.contains('Log out').click({ force: true })
        //                })
        //              })
        //            })
        //          })
        //        })
        //      })
        //    })

        //    cy.visit('http://localhost:3000/')

        //    //login by Standard Registry
        //    cy.get('#mat-input-0').type(Cypress.env('root_user'))
        //    cy.get('#mat-input-1').type('test')
        //    cy.get('[type="submit"]').click().then(() => {

        //      //grant KYC for the Installer
        //      cy.contains('Tokens').click()
        //      cy.get('@tokenId').then((tokenId) => {
        //        cy.contains(tokenId)
        //          .parents('tr')
        //          .find('td').eq('4')
        //          .find('a').click()
        //      })
        //    })
        //    cy.contains('Installer').parent().within(() => {
        //      cy.get('@tokenId').then((tokenId) => {
        //        let url = '/api/v1/tokens/' + tokenId + '/Installer/grantKyc'
        //        cy.intercept('PUT', url).as('waitForGrantKyc').then(() => {
        //          cy.get('td').eq('4').click()
        //            .then(() => {
        //              cy.wait('@waitForGrantKyc')
        //            })
        //        })
        //      })
        //    }).then(() => {

        //      //approve documents from the Installer
        //      cy.contains('Policies').click()
        //      cy.get('@policyName').then((policyName) => {
        //        cy.contains(policyName)
        //          .parent()
        //          .find('td').eq('10')
        //          .find('div').click({ force: true })
        //          .then(() => {
        //            cy.get('@policyId').then((policyId) => {
        //              cy.intercept('/api/v1/policies/' + policyId + '/tag/approve_documents_btn').as('waitForApprove').then(() => {
        //                cy.get('.btn-approve').click()
        //                cy.wait('@waitForApprove', { timeout: 180000 })
        //              })
        //            })
        //          })
        //        cy.contains(Cypress.env('root_user')).click().then(() => {
        //          cy.contains('Log out').click({ force: true })
        //        })
        //      })
        //    })

        //    cy.visit('http://localhost:3000/')

        //    //login by Installer
        //    cy.get('#mat-input-0').type(Cypress.env('installer_user'))
        //    cy.get('#mat-input-1').type('test')
        //    cy.get('[type="submit"]').click().then(() => {
        //      cy.contains('Policies').click({ force: true })

        //      //create New Sensors
        //      cy.get('@policyName').then((policyName) => {
        //        cy.get('@policyId').then((policyId) => {
        //          cy.intercept('/api/v1/policies/' + policyId + '/tag/download_config_btn').as('waitForSensorsButton').then(() => {
        //            cy.contains(policyName)
        //              .parent()
        //              .find('td').eq('4').click()
        //            cy.wait('@waitForSensorsButton', { timeout: 180000 }).then(() => {
        //              cy.contains('New Sensors').click()
        //              cy.contains('projectId').next().type('Some project id')
        //              cy.contains('projectName').next().type('Project name')
        //              cy.contains('sensorType').next().type('type of sensor')
        //              cy.contains('capacity').next().type('3')

        //              //download config
        //              cy.intercept('/api/v1/profiles/Installer').as('waitForDownloadConfig').then(() => {
        //                cy.contains('.mat-button-wrapper', 'Ok').click()
        //                cy.wait('@waitForDownloadConfig', { timeout: 180000 }).then(() => {
        //                  cy.contains('did:hedera:').invoke('text').invoke('replaceAll', ':', '_').invoke('replaceAll', ' ', '').as('fileName')
        //                  cy.contains('download').click()
        //                })
        //              })
        //              cy.contains(Cypress.env('installer_user')).click().then(() => {
        //                cy.contains('Log out').click({ force: true })
        //              })
        //            })
        //          })
        //        })
        //      })
        //    })

        //    cy.visit('http://localhost:3000/mrv-sender/')

        //    //upload config  and start token minting
        //    cy.get('@fileName').then((fileName) => {
        //      cy.get('[type="file"]').selectFile('cypress/downloads/' + fileName + '.config.json.config', { force: true }).then(() => {
        //        cy.get('[type="checkbox"]').click({ multiple: true })
        //        cy.get('.btn-ok').click().then(() => {
        //          cy.get('.config-control-start').click()
        //        })
        //      })
        //    })

        //    cy.visit('http://localhost:3000/')

        //    //login by Standard Registry and check that tokens are successfully minting
        //    cy.get('#mat-input-0').type(Cypress.env('root_user'))
        //    cy.get('#mat-input-1').type('test')
        //    cy.get('[type="submit"]').click().then(() => {
        //      cy.contains('Tokens').click()
        //      cy.get('@tokenId').then((tokenId) => {
        //        cy.contains(tokenId)
        //          .parents('tr')
        //          .find('td').eq('4')
        //          .find('a').click()
        //      })
        //    })
        //    cy.contains('Installer').parent().within(() => {
        //      cy.wait(20000).then(() => {
        //        cy.contains('refresh').click()
        //        cy.get('td').eq('2').invoke('text').should('be.equal', ' 1 ')
        //      })
        //    })
    });
});

export {};
