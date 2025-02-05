import { AuthenticationPage } from "../../pages/authentication";
import { HomePage } from "../../pages/homepage";
import { ConfigPage } from "../../pages/configpage";

const home = new AuthenticationPage();
const homepage = new HomePage();
const configpage = new ConfigPage();

context("Create User Accounts", { tags: ['ui'] }, () => {

    const SRName = "TestSRUI" + Math.floor(Math.random() * 9999);
    const userName = "TestUserUI" + Math.floor(Math.random() * 9999);
    //rofiw
    const HederaIDSR = "0.0.3567105";
    const HederaKeySR = "3030020100300706052b8104000a04220420075cb7e3ec00a9429d4a1a17eb87814fac4cf0a073e374c770aa0df6c4e3e6e4";
    //safos
    const HederaIDUser = "0.0.2667351";
    const HederaKeyUser = "3030020100300706052b8104000a04220420ba60bfa2abafe3e54644ba77a83d21890f58ac264d6231262105af93a376b88c";

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("Create Standard Registry by providing Hedera ID and KEY", () => {
        homepage.createAccount("SR", SRName);
        configpage.verifyUserCreated(SRName);
        configpage.hederaSRRegistration(HederaIDSR, HederaKeySR);

    });

    it("Create User by providing Hedera ID and KEY", () => {
        homepage.createAccount("User", userName);
        configpage.verifyUserCreated(userName);
        configpage.hederaUserRegistration(SRName, HederaIDUser, HederaKeyUser);
    });
});
