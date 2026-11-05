import { randomInt } from '../../../../support/random';
import { ContractsPage } from '../../pages/contractsPage';
const contractsPage = new ContractsPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

context('Workflow Contract Tags', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const runId = randomInt(1000000000);
    const wipeContract = 'wUIContract' + runId;
    const retireContract = 'rUIContract' + runId;
    const tagName = 'tagTestName';

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

    it('add contract tag', () => {
        contractsPage.openContractTypeTab('wipe');
        contractsPage.addTag(wipeContract, tagName);
        contractsPage.openContractTypeTab('retire');
        contractsPage.addTag(retireContract, tagName);
    });

    it('delete contract tag', () => {
        contractsPage.openContractTypeTab('wipe');
        contractsPage.deleteTag(wipeContract, tagName);
        contractsPage.openContractTypeTab('retire');
        contractsPage.deleteTag(retireContract, tagName);
    });

    after(() => {
        contractsPage.openContractsTab();
        contractsPage.removeContractNamed('wipe', wipeContract);
        contractsPage.removeContractNamed('retire', retireContract);
    });
});
