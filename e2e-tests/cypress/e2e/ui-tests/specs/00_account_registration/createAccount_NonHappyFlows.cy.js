import { HomePage } from "../../pages/homePage";
const homepage = new HomePage();

context("Create User Accounts_Non Happy Scenarios", { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const SRNameNew = "TestSRUI" + Math.floor(Math.random() * 9999);
    const userNameNew = "TestUserUI" + Math.floor(Math.random() * 9999);

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homepage.visit();
    })

    it("Verify error message when SR account with the same name alredy exists", () => {
        homepage.createAccount("SR", SRUsername);
        homepage.verifyAlert();
    });

    it("Verify error message when User account with the same name alredy exists", () => {
        homepage.createAccount("User", userUsername);
        homepage.verifyAlert();
    });

    it("Verify error message when the password is weak", () => {
        homepage.createAccount("User", userUsername + "1", "tt");
        homepage.verifyWeakPasswordAlert();
    });

    it("Verify error message when the username field is left blank in Create SR flow", () => {
        homepage.selectAccoutTypeToCreate("SR");
        homepage.checkCreateDisabledUserNameEmpty();
    });

    it("Verify error message when the username field is left blank in Create USER flow", () => {
        homepage.selectAccoutTypeToCreate("User");
        homepage.checkCreateDisabledUserNameEmpty();
    });

    it("Verify error message when the Password field is left blank in Create SR flow", () => {
        homepage.selectAccoutTypeToCreate("SR");
        homepage.checkCreateDisabledPasswordEmpty(SRNameNew);
    });

    it("Verify error message when the Password field is left blank in Create USER flow", () => {
        homepage.selectAccoutTypeToCreate("User");
        homepage.checkCreateDisabledPasswordEmpty(userNameNew);
    });

    it("Verify error message when the Confirm Password field is left blank in Create SR flow.", () => {
        homepage.selectAccoutTypeToCreate("SR");
        homepage.checkCreateDisabledConfirmPasswordEmpty(SRNameNew);
    });

    it("Verify error message when the Confirm Password field is left blank in Create USER flow.", () => {
        homepage.selectAccoutTypeToCreate("User");
        homepage.checkCreateDisabledConfirmPasswordEmpty(userNameNew);
    });

    it("Verify error message  when the Passwords do not match field is left blank in Create SR flow", () => {
        homepage.selectAccoutTypeToCreate("SR");
        homepage.checkCreateDisabledPasswordMismatch(SRNameNew);
    });

    it("Verify error message when the Passwords do not match field is left blank in Create USER flow", () => {
        homepage.selectAccoutTypeToCreate("User");
        homepage.checkCreateDisabledPasswordMismatch(userNameNew);
    });
});
