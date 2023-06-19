import { AuthenticationPage } from "../../pages/authentication";
import { HomePage } from "../../pages/homepage";
import { ConfigPage } from "../../pages/configpage";


const home = new AuthenticationPage();
const homepage = new HomePage();
const configpage = new ConfigPage();

describe("Create User Accounts",  { tags: '@ui' }, () => {
   
    const admin =  "ADMIN"+ Math.floor(Math.random() * 999);
    const auditor =  "AUDITOR"+ Math.floor(Math.random() * 999);
    const HederaIDSD = "0.0.3471154";
    const HederaKeySD = "302e020100300506032b657004220420cc8114f501e8a7c88ed911496a0c56a23e5e79fd4e553168ccb3c060366b86b3";
    const HederaIDUser = "0.0.14528652";
    const HederaKeyUser = "302e020100300506032b6570042204205a733b700280201593458481031a63789954f693482003adcc0a63058e8a25e5";
  
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
