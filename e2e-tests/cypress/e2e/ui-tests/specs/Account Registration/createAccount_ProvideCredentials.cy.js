import { AuthenticationPage } from "../../pages/authentication";
import { HomePage } from "../../pages/homepage";
import { ConfigPage } from "../../pages/configpage";

const home = new AuthenticationPage();
const homepage = new HomePage();
const configpage = new ConfigPage();

describe("Create User Accounts",  { tags: '@ui' }, () => {
    const admin =  "ADMIN"+ Math.floor(Math.random() * 999);
    const HederaIDSD = "0.0.1625455";
    const HederaKeySD = "302e020100300506032b657004220420ca6b3a49bff5b4cc371a293f32190d9ad27e22a4aead687f7fe3374a670b9702";
    const HederaIDUser = "0.0.1625463";
    const HederaKeyUser = "302e020100300506032b65700422042012804d59e7e381904f8fc409048f773d91c1e29622cd5a68d0fdaabe3c0e4d08";
  
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
