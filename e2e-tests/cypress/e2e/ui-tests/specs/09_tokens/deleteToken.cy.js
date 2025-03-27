import { TokensPage } from "../../pages/tokensPage";
const tokensPage = new TokensPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Token Deletion", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const tokenName = "UITokenName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
    })

    it("Verify Token can be Deleted  in Draft Status", () => {
        tokensPage.deleteToken("FTDraft" + tokenName);
    });

    it("Verify Token can be deleted in Published Status", () => {
        tokensPage.deleteToken("FTPublish" + tokenName);
    });

    it("Verify Token cannot be  Deleted when admin key is disabled", () => {
        tokensPage.deleteTokenDisabled("NFTPublishChanged" + tokenName);
    });
});
