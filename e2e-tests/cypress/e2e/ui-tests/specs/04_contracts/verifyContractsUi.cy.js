import { randomInt } from '../../../../support/random';
import { ContractsPage } from '../../pages/contractsPage';
const contractsPage = new ContractsPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

context('Workflow Contract UI Verify', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const runId = randomInt(1000000000);
    const wipeContract = 'wUIContract' + runId;
    const retireContract = 'rUIContract' + runId;

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        contractsPage.openContractsTab();
    })

    before(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        contractsPage.openContractsTab();
        contractsPage.createContractNamed('wipe', wipeContract);
        contractsPage.createContractNamed('retire', retireContract);
    });

    it('verify ui', () => {
        contractsPage.openContractTypeTab('wipe');
        contractsPage.verifyButtonsAndHeaders();
        contractsPage.verifyContractDataAndActions(wipeContract);
        contractsPage.openContractTypeTab('retire');
        contractsPage.verifyButtonsAndHeaders();
        contractsPage.verifyContractDataAndActions(retireContract);
    });

    after(() => {
        contractsPage.openContractsTab();
        contractsPage.removeContractNamed('wipe', wipeContract);
        contractsPage.removeContractNamed('retire', retireContract);
    });
});
