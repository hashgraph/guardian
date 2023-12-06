import { AuthenticationPage } from "../../pages/authentication";


const home = new AuthenticationPage();

describe("Create User Accounts",  { tags: '@ui' }, () => {

    const admin =  "ADMIN"+ Math.floor(Math.random() * 9999);

    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("Create Standard Registry by generating Hedera ID and KEY", () => {


        homepage.createStandartRegistryAccount(admin);
        cy.wait(3000);
        var option = "GENERATE";
        configpage.finishsetupSD(option);
        configpage.verifyHeaderLabelsOnLoginPageForAdmin();
        home.logOut(admin);

    });

});
