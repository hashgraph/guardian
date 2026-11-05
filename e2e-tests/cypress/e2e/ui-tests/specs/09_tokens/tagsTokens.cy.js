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

context('Token Tags', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const tagName = 'UITokenTag';
    const tokenName = 'FTDraftUITokenName' + randomInt(1000000000);

    before(() => {
        login(SRUsername);
        tokensPage.createToken(tokenName);
    });

    beforeEach(() => {
        login(SRUsername);
    });

    it('add token tag', () => {
        tokensPage.addTag(tokenName, tagName);
    });

    it('delete token tag', () => {
        tokensPage.deleteTag(tokenName, tagName);
    });

    after(() => {
        login(SRUsername);
        tokensPage.deleteToken(tokenName);
    });
});
