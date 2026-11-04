import { randomInt } from '../../../../support/random';
import { HomePage } from '../../pages/homePage';
const homepage = new HomePage();

import { ConfigPage } from '../../pages/configPage';
const configpage = new ConfigPage();

context('Create User Accounts', { tags: ['ui'] }, () => {

    const SRName = 'TestSRUI' + randomInt(1000000000);
    const SRUsername = Cypress.env('SRUser');
    // A fixed name would silently collide with the account a previous run left
    // behind; a 1e9 space keeps re-runs unique.
    const userName = 'TestUserUI' + randomInt(1000000000);

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
    })

    it('Create and registration Standard Registry', () => {
        homepage.createAccount('SR', SRName);
        configpage.verifyUserCreated(SRName);
        configpage.hederaSRRegistration('random', undefined, SRName);
    });

    it('Create and registration user', () => {
        homepage.createAccount('User', userName);
        configpage.verifyUserCreated(userName);
        configpage.hederaUserRegistration(SRUsername);
    });
});
