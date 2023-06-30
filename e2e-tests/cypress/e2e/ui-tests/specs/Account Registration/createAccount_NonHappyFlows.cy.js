import { AuthenticationPage } from "../../pages/authentication";
import { HomePage } from "../../pages/homepage";


const home = new AuthenticationPage();
const homepage = new HomePage();


describe("Create User Accounts_Non Happy Scenarios", { tags: '@ui' }, () => {
   
    beforeEach(() => {
        cy.viewport(1920, 1080);
        home.visit();
    })

    it("Verify error message when account with the same name alredy exists", () => {
        cy.viewport(1440, 900);
        home.visit();
        var account = 'StandardRegistry';
        homepage.createStandartRegistryAccount(account);
        homepage.verifyAlert();

    });

    it("Verify error message when the username field is left blank in Create SD flow", () => {
        homepage.clickStandardRegistry();
        homepage.checkCreateDisabledUserNameEmpty();

    });

    it("Verify error message when the Password field is left blank in Create SD flow", () => {

        homepage.clickStandardRegistry();
        homepage.checkCreateDisabledPasswordEmpty();

    });


    it("Verify error message when the Confirm Password field is left blank in Create SD flow.", () => {
        homepage.clickStandardRegistry();
        homepage.checkCreateDisabledConfirmPasswordEmpty();
    });

    it("Verify error message  when the Passwords do not match field is left blank in Create SD flow", () => {
        homepage.clickStandardRegistry();
        homepage.checkCreateDisabledPasswordMismatch();
    });


    it("Verify error message when the username field is left blank in Create USER flow", () => {
        homepage.clickUser();
        homepage.checkCreateDisabledUserNameEmpty();

    });

    it("Verify error message when the Password field is left blank in Create USER flow", () => {

        homepage.clickUser();
        homepage.checkCreateDisabledPasswordEmpty();

    });


    it("Verify error message when the Confirm Password field is left blank in Create USER flow.", () => {
        homepage.clickUser();
        homepage.checkCreateDisabledConfirmPasswordEmpty();
    });

    it("Verify error message when the Passwords do not match field is left blank in Create USER flow", () => {
        homepage.clickUser();
        homepage.checkCreateDisabledPasswordMismatch();
    });

    it("Verify error message when the username field is left blank in Create AUDITOR flow", () => {
        homepage.clickAuditor();
        homepage.checkCreateDisabledUserNameEmpty();

    });

    it("Verify error message when the Password field is left blank in Create AUDITOR flow", () => {

        homepage.clickAuditor();
        homepage.checkCreateDisabledPasswordEmpty();

    });


    it("Verify error message when the Confirm Password field is left blank in Create AUDITOR flow.", () => {
        homepage.clickAuditor();
        homepage.checkCreateDisabledConfirmPasswordEmpty();
    });

    it("Verify error message when the Passwords do not match field is left blank in AUDITOR USER flow", () => {
        homepage.clickAuditor();
        homepage.checkCreateDisabledPasswordMismatch();
    });

  



});
