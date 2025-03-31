import { TokensPage } from "../../pages/tokensPage";
const tokensPage = new TokensPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Token Tags", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const tagName = "UITokenTag";
    const tokenName = "NFTPublishChangedUITokenName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
    })

    it("add token tag", () => {
        tokensPage.addTag(tokenName, tagName);
    });

    it("delete token tag", () => {
        tokensPage.deleteTag(tokenName, tagName);
    });
});