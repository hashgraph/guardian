import { randomInt } from '../../../../support/random';
import { ContractsPage } from '../../pages/contractsPage';
const contractsPage = new ContractsPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

context('Workflow Contract Import', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const SR2Username = Cypress.env('SR2User');
    // Unique per run: the contracts of earlier runs stay in the lists.
    const runId = randomInt(1000000000);
    const ownerWipeContract = 'wOwnerUIContract' + runId;
    const ownerRetireContract = 'rOwnerUIContract' + runId;
    const wipeContract = 'wUIContract' + runId;
    const retireContract = 'rUIContract' + runId;
    let wipeContractId;
    let retireContractId;

    const login = (username) => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(username);
        contractsPage.openContractsTab();
    };

    // The contracts to import are deployed by the first registry, so the spec does not depend on
    // contracts that exist only on a particular Hedera network.
    before(() => {
        login(SRUsername);
        contractsPage.createContractNamed('wipe', ownerWipeContract);
        contractsPage.getContractId(ownerWipeContract).then((id) => { wipeContractId = id; });
        contractsPage.createContractNamed('retire', ownerRetireContract);
        contractsPage.getContractId(ownerRetireContract).then((id) => { retireContractId = id; });
    });

    beforeEach(() => {
        login(SR2Username);
    });

    it('Import contracts', () => {
        contractsPage.openContractTypeTab('wipe');
        contractsPage.importContract(wipeContractId, wipeContract);
        contractsPage.openContractTypeTab('retire');
        contractsPage.importContract(retireContractId, retireContract);
    });

    after(() => {
        contractsPage.removeContractNamed('wipe', wipeContract);
        contractsPage.removeContractNamed('retire', retireContract);
        login(SRUsername);
        contractsPage.removeContractNamed('wipe', ownerWipeContract);
        contractsPage.removeContractNamed('retire', ownerRetireContract);
    });
});
