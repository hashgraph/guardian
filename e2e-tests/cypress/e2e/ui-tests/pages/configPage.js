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
		win.document.querySelectorAll('button.p-toast-message-close').forEach((b) => b.click());
	});
}

export class ConfigPage {

	// A just-registered account auto-logs in and lands in the app; the header user
	// item shows the exact username once the workspace is rendered. The post-login
	// redirect can take as long as the app bootstrap on a loaded container, so the
	// wait is generous: a momentary /login in between must not fail the check.
	verifyUserCreated(username) {
		cy.location('pathname', { timeout: 60000 }).should('not.include', '/login');
		cy.get('.user-name', { timeout: 60000 }).should('be.visible').should('contain.text', username);
	}

	// Types values into a schema-driven form (app-schema-form-root) by field name. Each
	// field renders as .form-field whose .label-field shows the schema `description`
	// (prefixed with * when required); the editable control is the textarea inside it.
	fillSchemaFormFields(fields) {
		for (const [name, value] of Object.entries(fields)) {
			cy.get('app-schema-form-root .form-field', { timeout: 30000 }).each(($field) => {
				const label = $field.find('.label-field').first().text().replace(/[*\s]/g, '');
				if (label === name.replace(/[*\s]/g, '')) {
					cy.wrap($field).find('textarea, input').first().click().clear().type(value);
				}
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
			win.document.querySelectorAll('button.p-toast-message-close').forEach((b) => b.click());
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
		const FROZEN_MS = 15000;
		// Pace between tickets once the wizard has re-armed: the task cycle
		// is over, so 15s only avoids hammering a just-reset wizard.
		const RESET_PACING_MS = 15000;
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
					// eslint-disable-next-line cypress/no-unnecessary-waiting -- pacing of the self-scheduling poll; an assertion timeout cannot be branched on in Cypress 15, so the retry loop needs an explicit wait
					cy.wait(2000).then(tick);
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
					cy.reload().then(() => {
						reHedera();
						noButtonSince = null;
						// Let the freshly-bound socket settle before the next ticket.
						// eslint-disable-next-line cypress/no-unnecessary-waiting -- post-reload settle; the self-scheduling poll needs an explicit wait (Cypress 15)
						cy.wait(RESET_PACING_MS).then(tick);
					});
					return;
				}
				// eslint-disable-next-line cypress/no-unnecessary-waiting -- pacing of the self-scheduling poll; an assertion timeout cannot be branched on in Cypress 15, so the retry loop needs an explicit wait
				cy.wait(2000).then(tick);
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
		cy.get('#operatorId', { timeout: 60000 }).should('be.visible').should('be.enabled');
		if (hederaId === 'random') {
			cy.contains('button', 'Generate').should('be.visible');
		} else {
			cy.get('#operatorId').clear().type(hederaId);
			cy.get('#operatorKey').clear().type(hederaKey);
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
		cy.contains('button', 'Next').should('be.enabled');
		this.clickLabeledButton('Next');
		cy.contains('Generate new DID document.').should('be.visible', { timeout: 15000 });
		cy.contains('button', 'Next').should('be.enabled');
		this.clickLabeledButton('Next');
		cy.get('app-schema-form-root', { timeout: 30000 }).should('be.visible');
		dismissStickyToasts();
		// The VC document is the StandardRegistry schema form: OrganizationName, Website
		// and Tags are all required and no preset fills them, so Connect (gated on the
		// form status) stays disabled until each field is typed.
		this.fillSchemaFormFields({
			OrganizationName: organizationName || `SR-${Date.now()}`,
			Website: 'https://example.com',
			Tags: 'ui-test',
		});
		cy.contains('button', 'Connect').should('be.enabled', { timeout: 30000 });
		this.clickLabeledButton('Connect');
		// Profile registration runs as a worker task: the app leaves to /task/:id
		// and returns to the profile view when the task settles.
		cy.location('pathname', { timeout: 60000 }).should('include', '/task');
		cy.location('pathname', { timeout: 180000 }).should('not.include', '/task');
		cy.contains('did:hedera', { timeout: 15000 });
	}

	// Completes the user onboarding wizard for any account that landed on
	// /user-profile without a profile yet, linking it to SRNameToLink.
	hederaUserRegistration(SRNameToLink, hederaId = 'random', hederaKey) {
		// The wizard re-opens at the SR card list after a reload, so recovery
		// redoes the navigation from there to the HEDERA step.
		const reHedera = () => {
			cy.location('pathname', { timeout: 60000 }).should('include', '/user-profile');
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
			cy.contains('Create a New DID Document with Guardian').should('be.visible', { timeout: 15000 });
			cy.contains('button', 'Confirm').should('be.enabled', { timeout: 30000 });
			this.clickLabeledButton('Confirm');
		};

		runWizard();
		this.waitForTaskNavigationOrRecover(runWizard);
		// Profile registration runs as a worker task: the app leaves to /task/:id
		// and returns to the profile view when the task settles.
		cy.location('pathname', { timeout: 180000 }).should('not.include', '/task');
		cy.contains('did:hedera', { timeout: 15000 });
	}

	// The user wizard's first step lists the standard registries as cards (label +
	// value pairs); select the one whose Username matches.
	selectStandardRegistry(SRNameToLink) {
		cy.get('li.standard-registry__card', { timeout: 30000 }).should('have.length.be.greaterThan', 0);
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
			const deadline = Date.now() + 60000;
			const tick = () => {
				cy.window().then((win) => {
					if (win.location.pathname.includes('/task')) {
						return;
					}
					if (Date.now() <= deadline) {
						// eslint-disable-next-line cypress/no-unnecessary-waiting -- pacing of the self-scheduling poll; an assertion timeout cannot be branched on in Cypress 15
						cy.wait(3000).then(tick);
						return;
					}
					if (recovered) {
						throw new Error('the app never navigated to /task after two attempts');
					}
					recovered = true;
					cy.reload();
					cy.location('pathname', { timeout: 60000 }).should('include', '/user-profile');
					// Let the page decide: a completed profile renders the DID,
					// a missing one re-opens the wizard (the SR card list).
					const settleDeadline = Date.now() + 30000;
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
								// eslint-disable-next-line cypress/no-unnecessary-waiting -- pacing of the self-scheduling poll; an assertion timeout cannot be branched on in Cypress 15
								cy.wait(2000).then(settle);
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
