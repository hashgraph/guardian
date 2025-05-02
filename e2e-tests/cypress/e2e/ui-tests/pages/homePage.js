import URL from "../../../support/GuardianUrls";
import CommonElements from "../../../support/defaultUIElements";

const HomePageLocators = {
	usernameInput: '[formcontrolname="username"]',
	usernameLoginInput: '[formcontrolname="login"]',
	passInput: '[formcontrolname="password"]',
	confirmPassInput: '[formcontrolname="confirmPassword"]',
	loginButton: 'button[label="Log In"]',
	requestAccessButton: 'button[label="Request Access"]',
	continueButton: 'button[label="Continue"]',
	createLink: "Sign Up",
	SRtype: "Standard Registry",
	alert: '[role="alert"]',
	passwordDifError: " Passwords are different ",
	userAlreadyExistError: "An account with the same name already exists.",
	weakPassword: "Password must be at least 4 characters long.",
	logoutIcon: "[ng-reflect-content='Logout']"

	// submitBtn: '[type="submit"]',
	// logoutBtn: "Log out",
	// generateBtn: "Generate",
	// acceptBtn: 'button[label="Accept"]',
	// userType: 'Default User',
	// standardregistryBtn: "Standard Registry",
	// userBtn: "User",
	// auditorBtn: "Auditor",
	// auditEle: ' Audit ',
	// trustChainEle: ' Trust Chain ',
};

export class HomePage {
	visit() {
		cy.visit(URL.Root);
	}

	login(username, password = "test") {
		cy.get(HomePageLocators.usernameLoginInput).type(username);
		cy.get(HomePageLocators.passInput).type(password);
		cy.get(HomePageLocators.loginButton).click();
	}

	logOut(){
		cy.get(HomePageLocators.logoutIcon).click();
	}

	createAccount(accType, username, password = 'test') {
		this.selectAccoutTypeToCreate(accType);
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).click().type(username);
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).click().type(password);
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).click().type(password);
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).click();
	}

	selectAccoutTypeToCreate(accType){
		cy.contains(HomePageLocators.createLink).click();
		if (accType == "SR")
			cy.contains(HomePageLocators.SRtype).click();
		cy.get(HomePageLocators.continueButton).click();
	}

	verifyAlert() {
		cy.get(HomePageLocators.alert).children().contains(HomePageLocators.userAlreadyExistError).should('exist');
	}

	verifyWeakPasswordAlert() {
		cy.get(HomePageLocators.alert).children().contains(HomePageLocators.weakPassword).should('exist');
	}

	checkCreateDisabledUserNameEmpty() {
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).click().type('test');
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).click().type('test');
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).should('be.disabled');
	}

	checkCreateDisabledPasswordEmpty(username) {
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).click().type(username);
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).click().type('test');
		cy.get(CommonElements.dialogWindow).contains(HomePageLocators.passwordDifError).should('exist');
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).should('be.disabled');
	}

	checkCreateDisabledConfirmPasswordEmpty(username) {
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).click().type('test');
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).click().type(username);
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).should('be.disabled');
	}

	checkCreateDisabledPasswordMismatch(username) {
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).click().type(username);
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).click().type('test');
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).click().type('test1');
		cy.get(CommonElements.dialogWindow).contains(HomePageLocators.passwordDifError).should('exist');
		cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).should('be.disabled');
	}

	logoutAsStandartRegistry() {
		// const standartRegistry = cy.contains('StandardRegistry');
		// standartRegistry.click({ force: true });
		// cy.contains(HomePageLocators.logoutBtn).click({ force: true });
	}

	logoutAsInstaller() {
		// const Installer = cy.contains('Installer');
		// Installer.click({ force: true });
		// cy.contains(HomePageLocators.logoutBtn).click({ force: true });
	}

	logoutAsRegistrant() {
		// const Installer = cy.contains('Registrant');
		// Installer.click({ force: true });
		// cy.contains(HomePageLocators.logoutBtn).click({ force: true });
	}

	logoutAsVVB() {
		// const standartRegistry = cy.contains('VVB');
		// standartRegistry.click({ force: true });
		// cy.contains(HomePageLocators.logoutBtn).click({ force: true });
	}

	checkSetupInstaller() {
		// cy.wait(2000)
		// cy.get('body').then((body) => {
		// 	if (body.find('[role="combobox"]').length) {
		// 		//fill info for Installer
		// 		cy.get('[role="combobox"]').click().then(() => {
		// 			cy.get('[role="option"]').click()
		// 			cy.contains(HomePageLocators.generateBtn).click()
		// 			cy.wait(5000)
		// 		})
		// 		cy.contains('Submit').click()
		// 		cy.intercept('/api/v1/profiles/Installer').as('waitForRegisterInstaller')
		// 		cy.wait('@waitForRegisterInstaller', { timeout: 180000 }).then(() => {
		// 			cy.contains('Policies').click({ force: true })
		// 		})
		// 	}
		// })
	}

	checkSetupRegistrant() {
		// cy.wait(2000)
		// cy.get('body').then((body) => {
		// 	if (body.find('[role="combobox"]').length) {
		// 		//fill info for Registrant
		// 		cy.get('[role="combobox"]').click().then(() => {
		// 			cy.get('[role="option"]').click()
		// 			cy.contains(HomePageLocators.generateBtn).click()
		// 			cy.wait(5000)
		// 		})
		// 		cy.contains('Submit').click()
		// 		cy.intercept('/api/v1/profiles/Installer').as('waitForRegisterRegistrant')
		// 		cy.wait('@waitForRegisterRegistrant', { timeout: 8000 })
		// 	}
		// })
	}

	checkSetupVVB() {
		// cy.wait(2000)
		// cy.get('body').then((body) => {
		// 	if (body.find('[role="combobox"]').length) {
		// 		//fill info for Registrant
		// 		cy.get('[role="combobox"]').click().then(() => {
		// 			cy.get('[role="option"]').click()
		// 			cy.contains(HomePageLocators.generateBtn).click()
		// 			cy.wait(5000)
		// 		})
		// 		cy.contains('Submit').click()
		// 		cy.intercept('/api/v1/profiles/Installer').as('waitForVVB')
		// 		cy.wait('@waitForVVB', { timeout: 8000 })
		// 	}
		// })
	}

	createStandartRegistryAccount(username) {
		// cy.contains(HomePageLocators.createLnk).click();
		// cy.get(HomePageLocators.acceptBtn).click();
		// cy.contains(HomePageLocators.SRtype).click();
		// cy.get(HomePageLocators.continueBtn).click();
		// const inputName = cy.get(HomePageLocators.dialog).find(CommonPatterns.formControlNamePattern("username"));
		// inputName.click().clear();
		// inputName.type(username);
		// const inputPass = cy.get(HomePageLocators.dialog).find(CommonPatterns.formControlNamePattern("password"));
		// inputPass.click().clear();
		// inputPass.type('test123');
		// const confirminputPass = cy.get(HomePageLocators.dialog).find(CommonPatterns.formControlNamePattern("confirmPassword"));
		// confirminputPass.click().clear();
		// confirminputPass.type('test123');
		// cy.get(HomePageLocators.dialog).find(HomePageLocators.requestAccessBtn).click();
	}

	createAuditor(username) {
		// cy.contains(HomePageLocators.createLnk).click();
		// cy.contains(HomePageLocators.auditorBtn).click();
		// const inputName = cy.get(CommonPatterns.formControlNamePattern("username"));
		// inputName.click().clear();
		// inputName.type(username);
		// const inputPass = cy.get(CommonPatterns.formControlNamePattern("password"));
		// inputPass.click().clear();
		// inputPass.type('test123');
		// const confirminputPass = cy.get(CommonPatterns.formControlNamePattern("confirmPassword"));
		// confirminputPass.click().clear();
		// confirminputPass.type('test123');
		// cy.get(HomePageLocators.submitBtn).click();
		// cy.wait(2000)
		// cy.contains(HomePageLocators.auditEle).should('not.be.null');
		// cy.contains(HomePageLocators.trustChainEle).should('not.be.null');
	}

	createUserAccount(username) {
		// cy.contains(HomePageLocators.createLnk).click();
		// cy.get(HomePageLocators.acceptBtn).click();
		// cy.contains(HomePageLocators.userType).click();
		// cy.get(HomePageLocators.continueBtn).click();
		// const inputName = cy.get(HomePageLocators.dialog).find(CommonPatterns.formControlNamePattern("username"));
		// inputName.click().clear();
		// inputName.type(username);
		// const inputPass = cy.get(HomePageLocators.dialog).find(CommonPatterns.formControlNamePattern("password"));
		// inputPass.click().clear();
		// inputPass.type('test123');
		// const confirminputPass = cy.get(HomePageLocators.dialog).find(CommonPatterns.formControlNamePattern("confirmPassword"));
		// confirminputPass.click().clear();
		// confirminputPass.type('test123');
		// cy.get(HomePageLocators.dialog).find(HomePageLocators.requestAccessBtn).click();
	}
}
