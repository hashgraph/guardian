import { AuthenticationPage } from "../../pages/authentication";
import { TokensPage } from "../../pages/tokens";


const home = new AuthenticationPage();
const tokens = new TokensPage();

describe("Tags Tokens", { tags: '@ui' }, () => {

    const tagName = Math.floor(Math.random() * 999) + "tag";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("add token tag", () => {
        home.login("StandardRegistry");
        tokens.openTokensTab();
        tokens.addTag(tagName);
    });

    it("delete token tag", () => {
        home.login("StandardRegistry");
        tokens.openTokensTab();
        tokens.deleteTag(tagName);
    });
});