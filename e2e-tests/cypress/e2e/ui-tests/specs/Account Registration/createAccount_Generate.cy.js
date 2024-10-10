import { AuthenticationPage } from "../../pages/authentication";
import { HomePage } from "../../pages/homepage";
import { ConfigPage } from "../../pages/configpage";


const home = new AuthenticationPage();
const homepage = new HomePage();
const configpage = new ConfigPage();

describe("Create User Accounts",  { tags: '@ui' }, () => {

    const admin =  "ADMIN"+ Math.floor(Math.random() * 9999);
    const auditor =  "AUDITOR"+ Math.floor(Math.random() * 9999);
    
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



    it("Create User by generating Hedera ID and KEY", () => {
        var username = "USER" + Math.floor(Math.random() * 999);
        homepage.createUserAccount(username);
        cy.wait(3000);
        var option = "GENERATE";
        configpage.finishsetupUser(admin, username, option);
        configpage.verifyHeaderLabelsOnLoginPageForUser();
        home.logOut(username);
    });

  
    //Auditor doesn't exist
    // it("Create Auditor", () => {
    //     homepage.createAuditor(auditor);
    //     cy.wait(3000);
    //     home.logOut(auditor);
    // });



    
   
});
