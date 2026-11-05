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

// A published token or one without an admin key cannot be deleted, so those stay in the list.
context('Token Creation', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // Unique per run: the tokens of earlier runs stay in the list.
    const runId = randomInt(1000000000);
    const tokenName = 'UITokenName' + runId;
    const draftTokens = [];

    beforeEach(() => {
        login(SRUsername);
    });

    //tokensPage.createToken(name, published?, NFT?, adminkey?, wipekey?, freezeKey?, KYCkey?)
    //default                      false,      false,true,      true,     false,      false
    it('Create Fungible Token in Draft Status with default Options', () => {
        draftTokens.push('FTDraft' + tokenName);
        tokensPage.createToken('FTDraft' + tokenName);
    });

    it('Create Fungible Token in Published Status with default Options', () => {
        tokensPage.createToken('FTPublish' + tokenName, true);
    });

    it('Create NonFungible Token in Draft Status with default Options', () => {
        draftTokens.push('NFTDraft' + tokenName);
        tokensPage.createToken('NFTDraft' + tokenName, false, true);
    });

    it('Create NonFungible Token in Published Status with default Options', () => {
        tokensPage.createToken('NFTPublish' + tokenName, true, true);
    });

    it('Create Fungible Token in Published Status with  Options changed ', () => {
        draftTokens.push('FTDraftChanged' + tokenName);
        tokensPage.createToken('FTDraftChanged' + tokenName, false, false, false, false, true, true);
    });

    it('Create Non Fungible Token in Published Status with  Options changed ', () => {
        tokensPage.createToken('NFTPublishChanged' + tokenName, true, true, false, false, true, true);
    });

    after(() => {
        login(SRUsername);
        draftTokens.forEach((name) => tokensPage.deleteToken(name));
    });
});
