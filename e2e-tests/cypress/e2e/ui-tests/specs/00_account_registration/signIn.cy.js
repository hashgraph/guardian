import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

context('Sign in', { tags: ['ui', 'ui-all', 'all'] }, () => {

    const SRUsername = Cypress.expose('SRUser');
    const userUsername = Cypress.expose('User');

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    });

    it('signs in as each user in turn after signing out', () => {
        homePage.login(SRUsername);
        homePage.verifySignedInAs(SRUsername);
        homePage.logOut();
        homePage.login(userUsername);
        homePage.verifySignedInAs(userUsername);
        homePage.logOut();
        homePage.login(SRUsername);
        homePage.verifySignedInAs(SRUsername);
    });

    it('signs in again in a later test', () => {
        homePage.login(userUsername);
        homePage.verifySignedInAs(userUsername);
    });
});
