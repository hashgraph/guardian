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

context('Token Deletion', { tags: ['ui'] }, () => {

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

    it('Verify Token can be Deleted  in Draft Status', () => {
        tokensPage.deleteToken('FTDraft' + tokenName);
    });

    it('Verify Token can be deleted in Published Status', () => {
        tokensPage.deleteToken('FTPublish' + tokenName);
    });

    it('Verify Token cannot be  Deleted when admin key is disabled', () => {
        tokensPage.deleteTokenDisabled('NFTPublishChanged' + tokenName);
    });
});
