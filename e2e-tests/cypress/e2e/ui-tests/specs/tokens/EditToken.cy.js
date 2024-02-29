import { AuthenticationPage } from "../../pages/authentication";
import { TokensPage } from "../../pages/tokens";


const home = new AuthenticationPage();
const tokens = new TokensPage();

describe("Workflow Token Edit", { tags: '@ui' }, () => {


    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        tokens.openTokensTab();
        cy.wait(2000);
    })
    it("Verify  Token edited in Draft Status", () => {
        var createTokenName = "TokenForEdit" + Math.floor(Math.random() * 999);
        var EditTokenName = "TokenEditedDraft" + Math.floor(Math.random() * 999);
        var editTokenSymbol = 'N'
        tokens.createFungibleTokenInDraftStatusWithDefaultOptions(createTokenName);
        tokens.editToken(createTokenName, EditTokenName, editTokenSymbol);

    });

    it("Verify  Token edited in Published Status", () => {
        var createTokenName = "TokenForEdit" + Math.floor(Math.random() * 999);
        var EditTokenName = "TokenEditedPublished" + Math.floor(Math.random() * 999);
        var editTokenSymbol = 'N'
        tokens.createFungibleTokenInPublishedStatusWithDefaultOptions(createTokenName);
        tokens.editTokenPublished(createTokenName, EditTokenName, editTokenSymbol);
    });

    it("Verify Token cannot be  edited when admin key is disabled", () => {
        var TokenName = "EditDisableCheck" + Math.floor(Math.random() * 999);
        tokens.createFungibleTokenInPublishedStatusWithOptionsChanged(TokenName);
        tokens.editTokenDisabled(TokenName);
    });

    afterEach(() => {
        home.logOut("StandardRegistry");
    })




});
