import URL from '../../../support/GuardianUrls';
import CommonElements from '../../../support/defaultUIElements';
import { waitForTaskRoundtrip } from '../../../support/importFlow';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

const HomePageLocators = {
	usernameInput: '[formcontrolname="username"]',
	usernameLoginInput: '[formcontrolname="login"]',
	passInput: '[formcontrolname="password"]',
	confirmPassInput: '[formcontrolname="confirmPassword"]',
	loginButton: 'button[label="Log In"]',
	requestAccessButton: 'button[label="Register"]',
	continueButton: 'button[label="Continue"]',
	createLink: 'Sign Up',
	SRtype: 'Standard Registry',
	alert: '[role="alert"]',
	passwordDifError: ' Passwords are different ',
	userAlreadyExistError: 'An account with the same name already exists.'

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
		// A failed run leaks its session into the persistent browser profile, so the
		// next boot would auto-log in and skip the login page the Sign Up / login flows
		// depend on. Wipe the auth keys before the app boots to land on a known
		// logged-out state; specs that need a session call login() explicitly.
		cy.visit(URL.Root, {
			onBeforeLoad(win) {
				['accessToken', 'refreshToken', 'username'].forEach((key) => win.localStorage.removeItem(key));
			},
		});
		// A fresh browser must pull the whole app module graph through the dev server,
		// which on a loaded container can exceed the default 10s command timeout
		// (observed 25s); steps that race a mid-bootstrap app land on a blank page.
		// The app shell flips opacity off the global loader once startup is done.
		cy.get('app-root div.app', { timeout: TIMEOUTS.backend }).should('have.css', 'opacity', '1');
	}

	login(username, password) {
		cy.fixture('credentials').then(({ goodPassword }) => {
			cy.get(HomePageLocators.usernameLoginInput, { timeout: TIMEOUTS.backend }).type(username);
			cy.get(HomePageLocators.passInput).type(password ?? goodPassword);
			cy.get(HomePageLocators.loginButton).click();
		});
		// Wait until the app has finished redirecting to the authenticated workspace,
		// otherwise a cy.visit() issued right after would reload the app while it is
		// still on the login route and the auth guard would kick back to /login.
		cy.location('pathname', { timeout: TIMEOUTS.backend }).should('not.eq', '/login');
	}

	logOut() {
		// The whole header is only rendered while the session is alive (a 401 clears
		// it and Angular re-renders the navbar), and the sign-out control is
		// @if-gated on the persisted menu state - which the browser profile keeps
		// across runs: the expanded menu puts the sign-out icon in the DOM and
		// leaves the hover flyout out of it, the collapsed one does the reverse,
		// and the flyout only shows on a real :hover a test cannot produce.
		// Branch on DOM presence then, not layout metrics (getClientRects reports
		// 0 in the backgrounded electron window even for rendered elements), and
		// expand a collapsed menu first rather than trying to hover it.
		cy.window().its('document').then((doc) => {
			if (doc.querySelector('app-new-header i.logout-icon')) {
				return cy.get('app-new-header i.logout-icon', { timeout: TIMEOUTS.ui }).first().click();
			}
			cy.get('app-new-header div.collapse-toggle', { timeout: TIMEOUTS.ui }).click();
			return cy.get('app-new-header i.logout-icon', { timeout: TIMEOUTS.ui }).first().click();
		});
		// Give the auth teardown time to finish before the next login reuses the page
		cy.location('pathname', { timeout: TIMEOUTS.backend }).should('include', '/login');
	}

	createAccount(accType, username, password) {
		cy.fixture('credentials').then(({ goodPassword }) => {
			const pwd = password ?? goodPassword;
			this.selectAccoutTypeToCreate(accType);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).type(username);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).type(pwd);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).type(pwd);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).click();
		});
	}

	selectAccoutTypeToCreate(accType){
		cy.contains(HomePageLocators.createLink).click();
		if (accType == 'SR')
			{cy.contains(HomePageLocators.SRtype).click();}
		cy.get(HomePageLocators.continueButton).click();
		// The account-type dialog is removed from the DOM only after its close transition.
		// Until it is gone the app is mid re-render and keystrokes can land in the wrong
		// field (the dialog focus trap re-focuses the first input), so wait for the
		// register dialog to be the only one left before typing into it.
		cy.get(CommonElements.dialogWindow).should('have.length', 1);
	}

	/**
	 * Ensures an account exists AND is fully onboarded - a Hedera account, a
	 * DID document and a parent registry - which is what makes it appear in
	 * the SR user-management grid (the grid filters users by the parent's
	 * did; a self-registered account without one stays hidden there).
	 *
	 * The full path is the login page's self-service Sign Up (Sign Up ->
	 * Default User -> Register) plus the User Profile Setup wizard.
	 * Idempotent: a name already taken from a previous run is rejected by the
	 * backend, the flow logs the account back in, and the wizard only runs if
	 * a prior attempt left the account un-onboarded. The method always ends
	 * logged out on the login page.
	 */
	ensureAccount(username, srUsername) {
		cy.fixture('credentials').then(({ goodPassword }) => {
			// Aliased before the click: the Register click fires
			// POST /register, and the test waits on that response, not on a
			// UI flicker (a 409 duplicate answers in milliseconds, so the
			// form-hide/re-show window is not observable from the test side).
			cy.intercept('POST', '**/accounts/register*').as('registerSubmit');
			this.selectAccoutTypeToCreate();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).clear();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).type(username);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).clear();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).type(goodPassword);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).clear();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).type(goodPassword);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).click();
		});
		cy.wait('@registerSubmit');
		// Now one stable state holds: a duplicate re-showed the login form, a
		// fresh account is mid auto-login and will navigate away from /login.
		// A plain should() cannot accept both, so poll with a real timer.
		cy.then(() => new Promise((resolve, reject) => {
			const win = cy.state('window');
			const started = Date.now();
			const tick = () => {
				if (win.location.pathname !== '/login' || win.document.querySelector(HomePageLocators.usernameLoginInput)) {
					return resolve();
				}
				if (Date.now() - started > 60000) {
					return reject(new Error('the login page did not settle after the Sign Up flow within 60000ms'));
				}
				win.setTimeout(tick, 250);
			};
			tick();
		}));
		// A fresh account was auto-logged-in and lands on /user-profile with
		// the onboarding wizard; a duplicate left us on the login page, so log
		// in there and inspect the onboarding state instead: a run that died
		// mid-wizard in an earlier attempt must be completed, not re-registered.
		cy.location('pathname').then((path) => {
			if (path === '/login') {
				this.login(username);
			}
		});
		// The profile view re-renders as its first load settles. Until that first
		// response lands the component's default isNewAccount=false shows the "Creating
		// DID" loader (div.clock-list) for a flash, so a one-shot read of the view
		// mis-branches. Wait for the view to settle into a stable phase, then act on the
		// settled phase: 'wizard' (no DID yet) runs the setup wizard, 'ready' (already
		// confirmed) just signs out.
		return this._settledUserProfilePhase().then((phase) => {
			if (phase === 'wizard') {
				return this._runUserOnboarding(srUsername);
			}
			return this.logOut();
		});
	}

	/**
	 * Drives the User Profile Setup wizard to completion with all defaults
	 * (Standard Registry -> Hedera Account -> DID document). The submit starts
	 * the onboarding task, which navigates to /task/:id and back to
	 * /user-profile; a finished account carries a DID and a parent, which is
	 * what makes it visible in the SR user-management grid.
	 */
	_runUserOnboarding(srUsername) {
		// Every registered SR in the workspace renders as a card, so identify
		// the suite's SR by its Username row rather than by position.
		cy.get('li.standard-registry__card', { timeout: TIMEOUTS.backend })
			.filter((_, el) => Array.from(el.querySelectorAll('li.standard-registry__detail')).some((d) =>
				(d.querySelector('label') || {}).textContent?.trim() === 'Username'
				&& (d.querySelector('span') || {}).textContent?.trim() === srUsername))
			.first()
			.click();
		this._wizardStepNext();
		// Generate the Hedera account and key; the async task's result fills
		// the inputs when it completes.
		cy.get('button[label="Generate"]').click();
		cy.get('#operatorId', { timeout: TIMEOUTS.backend }).should('not.be.empty');
		cy.get('#operatorKey', { timeout: TIMEOUTS.backend }).should('not.be.empty');
		this._wizardStepNext();
		// The default radio generates a new DID document and needs no input.
		// If a workspace system schema for the USER entity ever appears, an
		// extra VC step is appended and its form must be filled first, which
		// would leave the button disabled and fail this wait deliberately.
		this._wizardStepNext();
		waitForTaskRoundtrip();
		cy.get('div.user-profile-setup-title').should('not.exist');
		this.logOut();
	}

	// The wizard footer's last step is labelled "Confirm" instead of "Next".
	_wizardStepNext() {
		cy.contains('div.user-profile-finish-buttons button', /^\s*(Next|Confirm)\s*$/, { timeout: TIMEOUTS.backend })
			.should('not.be.disabled')
			.click();
	}

	/**
	 * Waits for the user-profile view to settle into a stable phase and returns it.
	 *
	 * The view is gated on the profile's first load: while `loading` is set the
	 * preloader covers the page and only once that load answers do the real signals
	 * render, so the preloader is the "still loading" gate (the "Creating DID" loader
	 * that flashes up from the component's default isNewAccount=false sits under it).
	 * A settled phase is one that has held for a short while, which defeats the flash:
	 *
	 *   'wizard'  no DID document yet (div.user-profile-setup-title) - onboarding runs
	 *   'ready'   confirmed account (the regular profile's tabs-nav) - already onboarded
	 *
	 * Non-terminal phases (the preloader, the "Creating DID" loader, an unrecognised
	 * view) simply delay the decision. A view that never settles rejects on the
	 * deadline with the last phase so a stuck load is diagnosable instead of hanging.
	 */
	_settledUserProfilePhase(stableMs = 1500, deadlineMs = TIMEOUTS.backend) {
		const readPhase = (doc) => {
			if (doc.querySelector('.user-profile .loading')) {
				return 'loading';
			}
			if (doc.querySelector('div.user-profile-setup-title')) {
				return 'wizard';
			}
			if (doc.querySelector('div.clock-list')) {
				return 'creating';
			}
			if (doc.querySelector('.user-profile .error-list')) {
				return 'error';
			}
			if (doc.querySelector('.user-profile .tabs-nav')) {
				return 'ready';
			}
			return 'unknown';
		};
		return cy.then(() => new Promise((resolve, reject) => {
			const win = cy.state('window');
			const started = Date.now();
			let lastPhase = null;
			let phaseSince = 0;
			const tick = () => {
				const phase = readPhase(win.document);
				if (phase !== lastPhase) {
					lastPhase = phase;
					phaseSince = Date.now();
				}
				if (phase === 'error') {
					return reject(new Error(
						'user-profile reported an onboarding error (the account needs its DID setup retried in the UI)'));
				}
				if ((phase === 'wizard' || phase === 'ready') && Date.now() - phaseSince >= stableMs) {
					return resolve(phase);
				}
				if (Date.now() - started > deadlineMs) {
					return reject(new Error(
						`user-profile did not settle into a stable state within ${deadlineMs}ms (last phase: ${phase})`));
				}
				win.setTimeout(tick, 250);
			};
			tick();
		}));
	}

	verifyAlert() {
		// A duplicate-name registration fails server-side; the login page does not
		// surface that error, so the contract is that we end up still on the login
		// screen rather than in an authenticated app.
		cy.location('pathname').should('include', '/login');
	}

	verifyWeakPasswordAlert() {
		// Same contract as verifyAlert: a rejected registration leaves us on the login screen.
		cy.location('pathname').should('include', '/login');
	}

	checkCreateDisabledUserNameEmpty() {
		cy.fixture('credentials').then(({ goodPassword }) => {
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).type(goodPassword);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).type(goodPassword);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).should('be.disabled');
		});
	}

	checkCreateDisabledPasswordEmpty(username) {
		cy.fixture('credentials').then(({ goodPassword }) => {
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).type(username);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).type(goodPassword);
			cy.get(CommonElements.dialogWindow).contains(HomePageLocators.passwordDifError).should('exist');
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).should('be.disabled');
		});
	}

	checkCreateDisabledConfirmPasswordEmpty(username) {
		cy.fixture('credentials').then(({ goodPassword }) => {
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).type(goodPassword);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).type(username);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).should('be.disabled');
		});
	}

	checkCreateDisabledPasswordMismatch(username) {
		cy.fixture('credentials').then(({ goodPassword, altPassword }) => {
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.usernameInput).type(username);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.passInput).type(goodPassword);
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).click();
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.confirmPassInput).type(altPassword);
			cy.get(CommonElements.dialogWindow).contains(HomePageLocators.passwordDifError).should('exist');
			cy.get(CommonElements.dialogWindow).find(HomePageLocators.requestAccessButton).should('be.disabled');
		});
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
		// 		cy.wait('@waitForRegisterInstaller', { timeout: TIMEOUTS.longOperation }).then(() => {
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
		// 		cy.wait('@waitForRegisterRegistrant', { timeout: TIMEOUTS.ui })
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
		// 		cy.wait('@waitForVVB', { timeout: TIMEOUTS.ui })
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
