import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

import { ConfigPage } from "../../pages/configPage";
const configpage = new ConfigPage();

context("Create User Accounts", { tags: ['ui'] }, () => {

    const SRName = "TestSRUI" + Math.floor(Math.random() * 9999);
    const userName = "TestUserUI" + Math.floor(Math.random() * 9999);

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
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
