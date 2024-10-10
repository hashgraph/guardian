import { AuthenticationPage } from "../../pages/authentication";
import { TokensPage } from "../../pages/tokens";


const home = new AuthenticationPage();
const tokens = new TokensPage();

describe("Workflow Token Creation", { tags: '@ui' }, () => {

    const TokenName = + Math.floor(Math.random() * 999);
    
    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
        home.login("StandardRegistry");
        tokens.openTokensTab();
    })
    
    it("Create Fungible Token in Draft Status with default Options", () => {
        tokens.createFungibleTokenInDraftStatusWithDefaultOptions("FTDraft"+TokenName);
    });

    it("Create Fungible Token in Published Status with default Options", () => {
        tokens.createFungibleTokenInPublishedStatusWithDefaultOptions("FTPublished_"+TokenName);
    });

    it("Create NonFungible Token in Draft Status with default Options", () => {
        tokens.createNonFungibleTokenInDraftStatusWithDefaultOptions("NFTDraft_"+TokenName);
    });

    it("Create NonFungible Token in Published Status with default Options", () => {
        tokens.createNonFungibleTokenInPublishedStatusWithDefaultOptions("NFTPublish_"+TokenName);
    });

    it("Create Fungible Token in Published Status with  Options changed ", () => {
        tokens.createFungibleTokenInPublishedStatusWithOptionsChanged("FTPublish_change_"+TokenName);
    });

    it("Create Non Fungible Token in Published Status with  Options changed ", () => {
        tokens.createNonFungibleTokenInPublishedStatusWithOptionsChanged("NFTPublish_change_"+TokenName);
    });


    afterEach(() => {
        home.logOut("StandardRegistry");
    })

});
