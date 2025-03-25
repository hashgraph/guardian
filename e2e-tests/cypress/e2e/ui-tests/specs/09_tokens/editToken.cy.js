import { TokensPage } from "../../pages/tokensPage";
const tokensPage = new TokensPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Token Edition", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const tokenName = "UITokenName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
    })

    it("Verify Token edited in Draft Status", () => {
        tokensPage.createToken("FTDraft" + tokenName);
        tokensPage.editToken("FTDraft" + tokenName, "FTDraft" + tokenName + "Edited", "FTE");
    });

    it("Verify Token edited in Published Status", () => {
        tokensPage.createToken("FTPublish"+tokenName, true);
        tokensPage.editToken("FTPublish" + tokenName, "FTPublish" + tokenName + "Edited", "FTPE");
    });

    it("Verify Token cannot be edited when admin key is disabled", () => {
        tokensPage.editTokenDisabled("NFTPublishChanged" + tokenName);
    });
});
