import { TIMEOUTS, POLL_INTERVAL } from '../../../support/CustomHelpers/timeouts';
import { waitForTaskRoundtrip } from '../../../support/importFlow';
import { reloadProbed, waitForLocation, waitForLocationAwayFrom } from '../../../support/pageReadiness';
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
// before the real Confirm. The task navigation that follows the Confirm is
// deliberately NOT awaited here: it is a backend round trip (the gateway
// validates the JWT over NATS with no timeout, so the 202 has been seen to
// land right at a short deadline) whose budget and recovery - reload + redo -
// the callers own: waitForTaskNavigationOrRecover on the 00-spec path,
// waitForTaskRoundtrip on the 02-spec path.
export function completeUserWizard() {
	clickWizardFooterButton();
	// Poll only for the appended VC step: the step transition is client-side
	// and lands quickly, and whatever the app is doing otherwise - leaving
	// for /task, or stalling - is the caller's to settle with its own
	// recovery logic.
	const deadline = Date.now() + TIMEOUTS.ui;
	const tick = () => cy.window().then((win) => {
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

	// Clicks Generate and waits for the funded account to land in #operatorId.
	// Generate funds a fresh Hedera account on the worker (settles in <1s) and
	// the wizard patches both inputs when the task completes. The completion
	// rides a one-shot, user-gated WS notification (no replay, no polling
	// fallback; the async-progress component is recreated per task and its
	// taskId gate never re-syncs), so on a loaded stack most completions are
	// lost: the wizard either silently resets to idle (Generate re-armed) or
	// freezes on the spinner with the button unmounted - and the only escape
	// is a page reload (see pending-issues/registration-wizard-stalls-when-
	// the-task-result-is-lost.md).
	//
	// Every click is a ticket on an independent lottery: the worker completes
	// the task regardless, the loss is in the client-side delivery. A reload
	// rebinds the socket and re-opens the wizard, so `reHedera` (which must
	// bring the page back to a filled-in-ready HEDERA step) is called after
	// each recovery and the loop keeps counting tickets against the same
	// budget. Up to MAX_TICKETS tickets across MAX_PHASES phases; when the
	// budget is exhausted the test fails loudly on purpose rather than hang.
	generateHederaAccount(reHedera) {
		const MAX_TICKETS = 9;
		const MAX_RECOVERIES = MAX_TICKETS - 1;
		// A button absent for this long is a frozen wizard (a healthy
		// completion lands within a few seconds, a silent reset re-arms the
		// button well before this); it is the reload trigger.
		const FROZEN_MS = TIMEOUTS.ui;
		// Pace between tickets once the wizard has re-armed: a healthy account
		// creation takes a few seconds, so a ticket older than this has failed.
		const RESET_PACING_MS = TIMEOUTS.ui;
		let tickets = 0;
		let recoveries = 0;
		let lastClick = 0;
		let noButtonSince = null;
		const tick = () => {
			cy.window().then((win) => {
				const el = win.document.querySelector('#operatorId');
				if (el && el.value) {
					return; // funded account landed
				}
				const btn = Array.from(win.document.querySelectorAll('button'))
					.find((b) => (b.textContent || '').trim() === 'Generate');
				if (btn && !btn.disabled) {
					noButtonSince = null;
					if (Date.now() - lastClick >= RESET_PACING_MS) {
						if (tickets >= MAX_TICKETS) {
							throw new Error(`#operatorId never filled after ${MAX_TICKETS} Generate attempts`);
						}
						this.clickLabeledButton('Generate');
						tickets += 1;
						lastClick = Date.now();
					}
					cy.wait(POLL_INTERVAL).then(tick);
					return;
				}
				// find() yields undefined (not null) when the button is
				// unmounted, so the check must be truthiness-based or the
				// `.disabled` read throws before the frozen clock can start.
				if ((!btn || btn.disabled) && noButtonSince === null) {
					noButtonSince = Date.now();
				}
				// The button is gone (spinner freeze) or disabled: give a
				// brief grace for a mid-render state, then rule the wizard
				// stuck and recover with a reload.
				if (noButtonSince !== null && Date.now() - noButtonSince >= FROZEN_MS) {
					if (recoveries >= MAX_RECOVERIES) {
						throw new Error('#operatorId never filled and the Generate button is not coming back - the wizard is frozen and the recovery budget is exhausted');
					}
					recoveries += 1;
					reloadProbed().then(() => {
						reHedera();
						noButtonSince = null;
						cy.wait(POLL_INTERVAL).then(tick);
					});
					return;
				}
				cy.wait(POLL_INTERVAL).then(tick);
			});
		};
		// The loop performs the first ticket as well (a button that vanishes
		// before it can be clicked routes to the frozen recovery instead of a
		// test failure).
		tick();
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
		// After a recovery reload the profile-less SR account re-opens the wizard
		// directly at the HEDERA step (its first step), so re-establish just that
		// step; the generate loop then continues counting tickets against the
		// same budget.
		const reHedera = () => {
			this.hederaStep(hederaId, hederaKey);
		};
		this.hederaStep(hederaId, hederaKey);
		if (hederaId === 'random') {
			this.generateHederaAccount(reHedera);
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
		// The wizard re-opens at the SR card list after a reload, so recovery
		// redoes the navigation from there to the HEDERA step.
		const reHedera = () => {
			waitForLocation('/user-profile', { timeout: TIMEOUTS.backend });
			this.selectStandardRegistry(SRNameToLink);
			cy.contains('button', 'Next').should('be.enabled');
			this.clickLabeledButton('Next');
			this.hederaStep(hederaId, hederaKey);
		};
		const runWizard = () => {
			reHedera();
			if (hederaId === 'random') {
				this.generateHederaAccount(reHedera);
			}
			cy.contains('button', 'Next').should('be.enabled');
			this.clickLabeledButton('Next');
			cy.contains('Create a New DID Document with Guardian').should('be.visible', { timeout: TIMEOUTS.ui });
			completeUserWizard();
		};

		runWizard();
		this.waitForTaskNavigationOrRecover(runWizard);
		// Profile registration runs as a worker task: the app leaves to /task/:id
		// and returns to the profile view when the task settles.
		waitForLocationAwayFrom('/task', { timeout: TIMEOUTS.backend });
		cy.contains('did:hedera', { timeout: TIMEOUTS.ui });
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

	// Waits for the app to leave to /task after the final wizard step. If it never
	// does, the profile push is stuck server-side: the gateway validates the JWT
	// with a NATS request that has no timeout, so if the auth service does not
	// reply the HTTP request - and the whole wizard, frozen on a spinner - hangs
	// forever. Reload to break the hang and redo the wizard once; if the push
	// actually landed in the meantime the profile view shows the DID and the
	// redo is skipped.
	waitForTaskNavigationOrRecover(runWizard) {
		let recovered = false;
		const waitForTask = () => {
			const deadline = Date.now() + TIMEOUTS.backend;
			const tick = () => {
				cy.window().then((win) => {
					if (win.location.pathname.includes('/task')) {
						return;
					}
					if (Date.now() <= deadline) {
						cy.wait(POLL_INTERVAL).then(tick);
						return;
					}
					if (recovered) {
						throw new Error('the app never navigated to /task after two attempts');
					}
					recovered = true;
					reloadProbed();
					waitForLocation('/user-profile', { timeout: TIMEOUTS.backend });
					// Let the page decide: a completed profile renders the DID,
					// a missing one re-opens the wizard (the SR card list).
					const settleDeadline = Date.now() + TIMEOUTS.ui;
					const settle = () => {
						cy.window().then((w) => {
							const body = (w.document.body && w.document.body.textContent) || '';
							if (body.includes('did:hedera')) {
								return;
							}
							if (w.document.querySelectorAll('li.standard-registry__card').length > 0) {
								return;
							}
							if (Date.now() <= settleDeadline) {
								cy.wait(POLL_INTERVAL).then(settle);
								return;
							}
							throw new Error('after the recovery reload neither a profile nor the wizard appeared');
						});
					};
					settle();
					cy.window().then((w) => {
						if (((w.document.body && w.document.body.textContent) || '').includes('did:hedera')) {
							return; // the push landed after all - continue to the tail
						}
						runWizard();
						waitForTask();
					});
				});
			};
			tick();
		};
		waitForTask();
	}
}
