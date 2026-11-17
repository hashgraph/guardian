import { randomInt } from '../../../../support/random';
import { ContractsPage } from '../../pages/contractsPage';
const contractsPage = new ContractsPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

context('Workflow Contract Creation', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // Unique per run: the contracts of earlier runs stay in the list.
    const runId = randomInt(1000000000);
    const wipeContract = 'wUIContract' + runId;
    const retireContract = 'rUIContract' + runId;

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        contractsPage.openContractsTab();
    })

    //TBD:  Full flow with retire tokens
    it('Create contracts', () => {
        contractsPage.createContractNamed('wipe', wipeContract);
        contractsPage.createContractNamed('retire', retireContract);
    });

    after(() => {
        contractsPage.openContractsTab();
        contractsPage.removeContractNamed('wipe', wipeContract);
        contractsPage.removeContractNamed('retire', retireContract);
    });
});
