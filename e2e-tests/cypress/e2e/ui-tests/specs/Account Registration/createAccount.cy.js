import { AuthenticationPage } from "../../pages/authentication";
import { HomePage } from "../../pages/homepage";
import { ConfigPage } from "../../pages/configpage";


const home = new AuthenticationPage();
const homepage = new HomePage();
const configpage = new ConfigPage();

describe("Create User Accounts",  { tags: '@ui' }, () => {
   
    const admin =  "ADMIN"+ Math.floor(Math.random() * 999);
    const auditor =  "AUDITOR"+ Math.floor(Math.random() * 999);
    const HederaIDSD = "0.0.3979374";
    const HederaKeySD = "302e020100300506032b657004220420d13eb8a1b4135a971863f6dc6eccaa53d47e829740776e9d354aa7252dec6b7d";
    const HederaIDUser = "0.0.3979436";
    const HederaKeyUser = "302e020100300506032b657004220420f88a133b2ab50f885f0913a0c37daf05af216f557a32fdb8354370e81967733d";
  
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

    //ID and KEY has to be set unique for each Test
    it("Create Standard Registry by providing Hedera ID and KEY", () => {
        var admin =  "ADMIN"+ Math.floor(Math.random() * 999);
       homepage.createStandartRegistryAccount(admin);
        cy.wait(3000);
        cy.wait(3000);
        var option = "NOGENERATE";
        configpage.finishsetupSD(option,HederaIDSD,HederaKeySD);
        configpage.verifyHeaderLabelsOnLoginPageForAdmin();
        home.logOut(admin);

    });

    it("Create User by generating Hedera ID and KEY", () => {
        var username =  "USER"+ Math.floor(Math.random() * 999);
       homepage.createUserAccount(username);
        cy.wait(3000);
        var option = "GENERATE";
        configpage.finishsetupUser(admin,username,option);
            configpage.verifyHeaderLabelsOnLoginPageForUser();
        home.logOut(username);

    });

        //ID and KEY has to be set unique for each Test
    it("Create User by providing Hedera ID and KEY", () => {
        var username =  "USER"+ Math.floor(Math.random() * 999);
        homepage.createUserAccount(username);
        cy.wait(3000);
        var option = "NOGENERATE";
        configpage.finishsetupUser(admin,username,option,HederaIDUser,HederaKeyUser);
        configpage.verifyHeaderLabelsOnLoginPageForUser();
        home.logOut(username);

    });

    it("Create Auditor", () => {
        homepage.createAuditor(auditor);
        cy.wait(3000);
        home.logOut(auditor);

    });



    
   
});
