import { TIMEOUTS, POLL_INTERVAL } from '../../../support/CustomHelpers/timeouts';
import { waitForTaskRoundtrip } from '../../../support/importFlow';
import { waitForLocation, waitForLocationAwayFrom } from '../../../support/pageReadiness';
// New-app wizard flows (PrimeNG DOM). The SR profile wizard lives at /config
// (HEDERA -> DID -> [DID_KEYS] -> VC) and the user profile wizard at /user-profile
// (select SR -> HEDERA -> DID document -> [VC document]). p-button keeps no label
// attribute in the DOM - the label is an inner span - so buttons are matched by text.

// PrimeNG sticky toasts (e.g. the "User is not registered" one the notification
// worker raises while a freshly-created account is not yet fully registered) render
// at the bottom-right and can cover the wizard action buttons, making cy.click()
// fail with "covered by another element". Click every close button that exists
// right now; never fail when no toast is present.
export function dismissStickyToasts() {
	cy.window().then((win) => {
		win.document.querySelectorAll('button.p-toast-close-button').forEach((b) => b.click());
	});
}

// The user wizard's footer renders exactly one primary button: "Next" while a
// step remains, "Confirm" on the last step (p-button keeps no label attribute
// in the DOM - the label is an inner span - so the button is matched by text).
// Sticky toasts re-spawn on every failed re-poll and can sit on the button,
// so the dismiss and the click run in the same tick.
export function clickWizardFooterButton() {
	cy.window().then((win) => {
		win.document.querySelectorAll('button.p-toast-close-button').forEach((b) => b.click());
		const btn = Array.from(win.document.querySelectorAll('.user-profile-finish-buttons button'))
			.find((b) => ['Next', 'Confirm'].includes((b.textContent || '').trim()));
		if (!btn) {
			throw new Error('wizard footer button not found');
		}
		if (btn.disabled) {
			throw new Error('wizard footer button is disabled');
		}
		btn.click();
	});
}

// An active USER system schema in the workspace appends a VC document step to
// the user wizard whose form is driven by that schema. The API suite's
// 011_schemas spec activates one and the product cannot deactivate it, so the
// schema is test data whose fields the driver must not know: every editable
// control of the form is filled with a placeholder (readonly fields are
// populated by the form engine itself).
export function fillWizardSchemaForm() {
	cy.get('app-schema-form-root .form-field', { timeout: TIMEOUTS.ui }).then(($fields) => {
		let editable = 0;
		$fields.each((_, field) => {
			const control = field.querySelector('textarea, input');
			if (!control || control.readOnly || control.disabled) {
				return;
			}
			editable += 1;
			cy.wrap(field).find('textarea, input').first().click();
			cy.wrap(field).find('textarea, input').first().clear();
			cy.wrap(field).find('textarea, input').first().type('e2e');
		});
		expect(editable, 'the VC step form to expose an editable field').to.be.greaterThan(0);
	});
}

// Drives the wizard from the DID step to the onboarding push across both
// shapes: without the appended VC step the footer click is the final Confirm,
// with it the footer click advances to the VC step, whose form must be filled
// before the real Confirm. The task round trip that follows the Confirm is
// the caller's to wait for.
export function completeUserWizard() {
	clickWizardFooterButton();
	// Poll only for the appended VC step: the step transition is client-side
	// and lands quickly, and whatever the app is doing otherwise - leaving
	// for /task, or stalling - is the caller's to settle. Once the page has
	// left the wizard there is no VC step to
	// wait for, and polling on would let a fast /task round trip end unseen.
	// The deadline is armed when the poll runs, not when it is queued.
	let deadline;
	const tick = () => cy.window().then((win) => {
		deadline ??= Date.now() + TIMEOUTS.ui;
		if (!win.location.pathname.includes('/user-profile')) {
			return;
		}
		if (win.document.querySelector('app-schema-form-root')) {
			fillWizardSchemaForm();
			clickWizardFooterButton();
			return;
		}
		if (Date.now() < deadline) {
			cy.wait(POLL_INTERVAL).then(tick);
			return;
		}
	});
	tick();
}

export class ConfigPage {

	// A just-registered account auto-logs in and lands in the app; the header user
	// item shows the exact username once the workspace is rendered. The post-login
	// redirect can take as long as the app bootstrap on a loaded container, so the
	// wait is generous: a momentary /login in between must not fail the check.
	verifyUserCreated(username) {
		waitForLocationAwayFrom('/login', { timeout: TIMEOUTS.backend });
		cy.get('.user-name', { timeout: TIMEOUTS.backend }).should('be.visible').should('contain.text', username);
	}

	// Types values into a schema-driven form (app-schema-form-root) by field name. Each
	// field renders as .form-field whose .sf-label-text shows the schema `description`
	// (required fields carry a * outside it); the editable control is the textarea inside it.
	fillSchemaFormFields(fields) {
		for (const [name, value] of Object.entries(fields)) {
			cy.get('app-schema-form-root .form-field', { timeout: TIMEOUTS.backend }).then(($fields) => {
				const $field = $fields.filter((_, field) => (
					field.querySelector('.sf-label-text')?.textContent.replace(/[*\s]/g, '') === name.replace(/[*\s]/g, '')
				));
				expect($field, `form field "${name}"`).to.have.length(1);
				cy.wrap($field).find('textarea, input').first().click();
				cy.wrap($field).find('textarea, input').first().clear();
				cy.wrap($field).find('textarea, input').first().type(value);
			});
		}
	}

	// Clicks a labeled wizard action button. Sticky toasts re-spawn on every
	// external-policies 422 re-poll and can land between a dismissStickyToasts()
	// and a cy.click(), re-covering the button ("covered by another element"), so
	// the dismiss and the click run in the same tick; a direct DOM click also
	// ignores overlay coverage. Callers keep a cy.contains(...) precondition, so
	// a genuinely missing or disabled button still fails loudly.
	clickLabeledButton(label) {
		cy.window().then((win) => {
			win.document.querySelectorAll('button.p-toast-close-button').forEach((b) => b.click());
			const btn = Array.from(win.document.querySelectorAll('button'))
				.find((b) => (b.textContent || '').trim() === label);
			if (!btn) {
				throw new Error(`wizard button not found: ${label}`);
			}
			if (btn.disabled) {
				throw new Error(`wizard button is disabled: ${label}`);
			}
			btn.click();
		});
	}

	// Generate funds a fresh Hedera account on the worker; the wizard fills both inputs when the task
	// completes.
	generateHederaAccount() {
		cy.contains('button', 'Generate').should('be.enabled');
		this.clickLabeledButton('Generate');
		cy.get('#operatorId', { timeout: TIMEOUTS.backend }).should('not.have.value', '');
		cy.get('#operatorKey', { timeout: TIMEOUTS.backend }).should('not.have.value', '');
	}

	// The HEDERA credentials step, shared by both wizards: asserts the step is
	// rendered with its controls and, for manual accounts, fills them. The
	// random (Generate) case is driven by `generateHederaAccount`.
	hederaStep(hederaId = 'random', hederaKey) {
		cy.get('#operatorId', { timeout: TIMEOUTS.backend }).should('be.visible').should('be.enabled');
		if (hederaId === 'random') {
			cy.contains('button', 'Generate').should('be.visible');
		} else {
			cy.get('#operatorId').clear();
			cy.get('#operatorId').type(hederaId);
			cy.get('#operatorKey').clear();
			cy.get('#operatorKey').type(hederaKey);
		}
	}

	// Completes the Standard Registry setup wizard for any account that landed on
	// /config without a profile yet.
	hederaSRRegistration(hederaId = 'random', hederaKey, organizationName) {
		this.hederaStep(hederaId, hederaKey);
		if (hederaId === 'random') {
			this.generateHederaAccount();
		}
		// Read before leaving the step: a recovery spec needs the generated credentials.
		const credentials = {};
		cy.get('#operatorId').invoke('val').then((accountId) => { credentials.accountId = accountId; });
		cy.get('#operatorKey').invoke('val').then((accountKey) => { credentials.accountKey = accountKey; });
		cy.contains('button', 'Next').should('be.enabled');
		this.clickLabeledButton('Next');
		cy.contains('Generate new DID document.').should('be.visible', { timeout: TIMEOUTS.ui });
		cy.contains('button', 'Next').should('be.enabled');
		this.clickLabeledButton('Next');
		cy.get('app-schema-form-root', { timeout: TIMEOUTS.backend }).should('be.visible');
		dismissStickyToasts();
		// The VC document is the StandardRegistry schema form: OrganizationName, Website
		// and Tags are all required and no preset fills them, so Connect (gated on the
		// form status) stays disabled until each field is typed.
		this.fillSchemaFormFields({
			OrganizationName: organizationName || `SR-${Date.now()}`,
			Website: 'https://example.com',
			Tags: 'ui-test',
		});
		cy.contains('button', 'Connect').should('be.enabled', { timeout: TIMEOUTS.backend });
		this.clickLabeledButton('Connect');
		// Profile registration runs as a worker task: the app leaves to /task/:id
		// and returns to the profile view when the task settles. The Connect
		// chain (topic, DID, five schemas, roles, save) takes about 20 s
		// server-side on a loaded Solo container - the whole short backend
		// budget a fixed assert would get - so the return leg gets the
		// longOperation budget of the shared round trip wait.
		waitForTaskRoundtrip();
		cy.contains('did:hedera', { timeout: TIMEOUTS.ui });
		return cy.then(() => credentials);
	}

	// Restores a Standard Registry profile from its Hedera credentials: the
	// profile-less account opens the wizard at the HEDERA step, "Restore data"
	// skips the custom DID document, and the topic found on the account is submitted.
	// The restore task itself runs after this returns; the caller asserts its outcome.
	restoreProfileFromHedera({ accountId, accountKey }) {
		this.hederaStep(accountId, accountKey);
		cy.contains('button', 'Restore data').should('be.enabled');
		this.clickLabeledButton('Restore data');
		cy.contains('button', 'Next').should('be.enabled');
		this.clickLabeledButton('Next');
		this.loadRestorableTopic();
		this.clickLabeledButton('Proceed');
	}

	// "Load topics" is a worker task and the newest topic is then selected automatically
	// (which is what enables Proceed). guardian-service caches the main topic for 2 minutes,
	// so a registry created since the last read only shows up once that cache expires: click
	// again until a topic is selected.
	loadRestorableTopic() {
		// enough attempts to outlast the 2 minute cache, each one waiting for the task result
		const MAX_ATTEMPTS = 12;
		const isProceedEnabled = (win) => {
			const proceed = Array.from(win.document.querySelectorAll('button'))
				.find((b) => (b.textContent || '').trim() === 'Proceed');
			return Boolean(proceed && !proceed.disabled);
		};
		const attempt = (number) => {
			this.clickLabeledButton('Load topics');
			const deadline = Date.now() + TIMEOUTS.ui;
			const check = () => cy.window().then((win) => {
				if (isProceedEnabled(win)) {
					return;
				}
				if (Date.now() < deadline) {
					cy.wait(POLL_INTERVAL).then(check);
					return;
				}
				if (number >= MAX_ATTEMPTS) {
					throw new Error(`no restorable topic found after ${MAX_ATTEMPTS} attempts`);
				}
				attempt(number + 1);
			});
			check();
		};
		attempt(1);
	}

	// Completes the user onboarding wizard for any account that landed on
	// /user-profile without a profile yet, linking it to SRNameToLink.
	hederaUserRegistration(SRNameToLink, hederaId = 'random', hederaKey) {
		waitForLocation('/user-profile', { timeout: TIMEOUTS.backend });
		this.selectStandardRegistry(SRNameToLink);
		cy.contains('button', 'Next').should('be.enabled');
		this.clickLabeledButton('Next');
		this.hederaStep(hederaId, hederaKey);
		if (hederaId === 'random') {
			this.generateHederaAccount();
		}
		cy.contains('button', 'Next').should('be.enabled');
		this.clickLabeledButton('Next');
		cy.contains('Create a New DID Document with Guardian').should('be.visible', { timeout: TIMEOUTS.ui });
		completeUserWizard();
		// Profile registration runs as a worker task: the app goes to /task/:id and comes back to the
		// profile view, which shows the new DID, when the task settles. The round trip can be over
		// before a check for /task runs, so wait for its outcome.
		cy.contains('did:hedera', { timeout: TIMEOUTS.longOperation });
		cy.location('pathname', { timeout: TIMEOUTS.backend }).should('include', '/user-profile');
	}

	// The user wizard's first step lists the standard registries as cards (label +
	// value pairs); select the one whose Username matches.
	selectStandardRegistry(SRNameToLink) {
		cy.get('li.standard-registry__card', { timeout: TIMEOUTS.backend }).should('have.length.be.greaterThan', 0);
		cy.window().then((win) => {
			for (const card of win.document.querySelectorAll('li.standard-registry__card')) {
				for (const detail of card.querySelectorAll('li')) {
					const label = detail.querySelector('label');
					const span = detail.querySelector('span');
					if (label && label.textContent.trim() === 'Username' && span && span.textContent.trim() === SRNameToLink) {
						card.click();
						return;
					}
				}
			}
			throw new Error('no standard registry card for ' + SRNameToLink);
		});
	}
}
