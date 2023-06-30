import { AuthenticationPage } from "../../pages/authentication";
import { HomePage } from "../../pages/homepage";
import { ConfigPage } from "../../pages/configpage";
import { slowCypressDown } from 'cypress-slow-down'

const home = new AuthenticationPage();
const homepage = new HomePage();
const configpage = new ConfigPage();

describe("Create User Accounts",  { tags: '@ui' }, () => {
    slowCypressDown(320) ;
    const admin =  "ADMIN"+ Math.floor(Math.random() * 999);
    const HederaIDSD = "0.0.3978325";
    const HederaKeySD = "302e020100300506032b65700422042074cf1316884a78ccb24b9a3313cf800f297b1c06a2b089829602b3a23edbf55c";
    const HederaIDUser = "0.0.3979436";
    const HederaKeyUser = "302e020100300506032b657004220420f88a133b2ab50f885f0913a0c37daf05af216f557a32fdb8354370e81967733d";
  
    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })
    


    //ID and KEY has to be set unique for each Test
    it("Create Standard Registry by providing Hedera ID and KEY", () => {
       homepage.createStandartRegistryAccount(admin);
        cy.wait(3000);
        cy.wait(3000);
        var option = "NOGENERATE";
        configpage.finishsetupSD(option,HederaIDSD,HederaKeySD);
        configpage.verifyHeaderLabelsOnLoginPageForAdmin();
        home.logOut(admin);

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

 
   
});
