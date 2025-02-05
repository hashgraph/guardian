import { AuthenticationPage } from "../../pages/authentication";
import { HomePage } from "../../pages/homepage";
import { ConfigPage } from "../../pages/configpage";

const home = new AuthenticationPage();
const homepage = new HomePage();
const configpage = new ConfigPage();

context("Create User Accounts", { tags: ['ui'] }, () => {

    const SRName = "TestSRUI" + Math.floor(Math.random() * 9999);
    const userName = "TestUserUI" + Math.floor(Math.random() * 9999);

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("Create and registration Standard Registry", () => {
        homepage.createAccount("SR", SRName);
        configpage.verifyUserCreated(SRName);
        configpage.hederaSRRegistration();
    });

    it("Create and registration user", () => {
        homepage.createAccount("User", userName);
        configpage.verifyUserCreated(userName);
        configpage.hederaUserRegistration(SRName);
    });
});
