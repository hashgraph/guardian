import { randomInt } from '../../../../support/random';
import { TokensPage } from '../../pages/tokensPage';
const tokensPage = new TokensPage();

import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

const login = (username) => {
    cy.viewport(1920, 1080);
    homePage.visit();
    homePage.login(username);
    tokensPage.openTokensTab();
};

context('Token Edition', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const tokenName = 'UITokenName' + randomInt(1000000000);

    before(() => {
        login(SRUsername);
        tokensPage.createToken('FTDraft' + tokenName);
        tokensPage.createToken('FTPublish' + tokenName, true);
        tokensPage.createToken('NFTPublishChanged' + tokenName, true, true, false, false, true, true);
    });

    beforeEach(() => {
        login(SRUsername);
    });

    it('Verify Token edited in Draft Status', () => {
        tokensPage.editToken('FTDraft' + tokenName, 'FTDraft' + tokenName + 'Edited', 'FTE');
    });

    it('Verify Token edited in Published Status', () => {
        tokensPage.editToken('FTPublish' + tokenName, 'FTPublish' + tokenName + 'Edited', 'FTPE');
    });

    it('Verify Token cannot be edited when admin key is disabled', () => {
        tokensPage.editTokenDisabled('NFTPublishChanged' + tokenName);
    });

    after(() => {
        login(SRUsername);
        tokensPage.deleteToken('FTDraft' + tokenName + 'Edited');
    });
});
