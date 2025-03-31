import { TokensPage } from "../../pages/tokensPage";
const tokensPage = new TokensPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();

context("Token Creation", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const tokenName = "UITokenName";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
    });

    //tokensPage.createToken(name, published?, NFT?, adminkey?, wipekey?, freezeKey?, KYCkey?)
    //default                      false,      false,true,      true,     false,      false
    it("Create Fungible Token in Draft Status with default Options", () => {
        tokensPage.createToken("FTDraft"+tokenName);
    });

    it("Create Fungible Token in Published Status with default Options", () => {
        tokensPage.createToken("FTPublish"+tokenName, true);
    });

    it("Create NonFungible Token in Draft Status with default Options", () => {
        tokensPage.createToken("NFTDraft"+tokenName, false, true);
    });

    it("Create NonFungible Token in Published Status with default Options", () => {
        tokensPage.createToken("NFTPublish"+tokenName, true, true);
    });

    it("Create Fungible Token in Published Status with  Options changed ", () => {
        tokensPage.createToken("FTDraftChanged"+tokenName, false, false, false, false, true, true);
    });

    it("Create Non Fungible Token in Published Status with  Options changed ", () => {
        tokensPage.createToken("NFTPublishChanged"+tokenName, true, true, false, false, true, true);
    });
});
