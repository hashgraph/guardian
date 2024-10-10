import { AuthenticationPage } from "../../pages/authentication";
import { TokensPage } from "../../pages/tokens";

const home = new AuthenticationPage();
const tokens = new TokensPage();

describe("Workflow Token Edit", { tags: '@ui' }, () => {

    const createTokenName = + Math.floor(Math.random() * 999);

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        tokens.openTokensTab();
        cy.wait(2000);
    })


    it("Verify Token can be Deleted  in Draft Status", () => {

        tokens.createFungibleTokenInDraftStatusWithDefaultOptions("TokenDeleteDraft_" + createTokenName);
        tokens.deleteToken(createTokenName);


    });

    it("Verify  Token can be deleted in Published Status", () => {

        tokens.createFungibleTokenInPublishedStatusWithDefaultOptions("TokenDeletePublished_" + createTokenName);
        tokens.deleteToken(createTokenName);


    });


    it("Verify Token cannot be  Deleted when admin key is disabled", () => {
        var TokenName = "EditDisableCheck" + Math.floor(Math.random() * 999);
        tokens.createFungibleTokenInPublishedStatusWithOptionsChanged(TokenName);
        tokens.deleteTokenDisabled(TokenName);
    });


    afterEach(() => {
        home.logOut("StandardRegistry");
    })

});
