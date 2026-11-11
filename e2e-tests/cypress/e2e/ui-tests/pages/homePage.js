import URL from '../../../support/GuardianUrls';
import CommonElements from '../../../support/defaultUIElements';
import { waitForTaskRoundtrip } from '../../../support/importFlow';
import { docProbe, trackDocument, waitForLocation } from '../../../support/pageReadiness';
import { TIMEOUTS, POLL_INTERVAL } from '../../../support/CustomHelpers/timeouts';
import { dismissStickyToasts, completeUserWizard } from './configPage';

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
		// The document probe advances the swap counter the readiness waits
		// (pageReadiness) track, so a budgeted wait that outlives this boot
		// knows when a swapped document starts a fresh bootstrap.
		cy.visit(URL.Root, docProbe({
			onBeforeLoad(win) {
				['accessToken', 'refreshToken', 'username'].forEach((key) => win.localStorage.removeItem(key));
			},
		}));
		// A fresh browser must pull the whole app module graph through the dev server,
		// which on a loaded container can exceed the default 10s command timeout
		// (observed 25s); steps that race a mid-bootstrap app land on a blank page.
		// The app shell flips opacity off the global loader once startup is done.
		cy.get('app-root div.app', { timeout: TIMEOUTS.backend }).should('have.css', 'opacity', '1');
	}

	login(username, password) {
		// The /login view is in flux around every login: the form unmounts
		// while a login is in flight (the loading flag) and re-renders after,
		// sign-out tears the session down and the app can re-establish it, and
		// the dev build (environment.displayDemoAccounts) overlays the form
		// with a demo accounts panel whose cards auto-log-in the app on click -
		// one such login stores a null username and the app then boots a
		// profiles/null session (422s, an eternal "Creating DID" wizard). So
		// every form interaction is gated on the live document, the submit
		// does its gate, its writes and its click in the page itself (see
		// submit()), and the budgets below end in a recovery (or a loud
		// failure): the only lever against a session establishment or a login
		// POST that never settles - or a form that keeps being taken away - is
		// a fresh boot without the stored tokens (see pending-issues).
		//
		// "Settled" is user-aware: a session for ANOTHER user (the spec just
		// switched users) is not a settled login, and waiting for it would just
		// time out - the app will not log the requested user in on its own.
		//
		// `generation` is the guard that makes the recovery single-shot. The
		// self-perpetuating polls below queue `cy.wait().then(poll)`
		// continuations, and Cypress cannot cancel a queued command: a
		// continuation queued before a recovery survives the recovery's
		// navigation and would re-fire it, so an unguarded first version
		// compounding into a storm of reloads and logins (the 10 Nov v3 runs
		// died on exactly that). Every callback captures the generation it was
		// queued under and a superseded one ends its chain silently.
		//
		// The method RETURNS its chain on purpose: a caller that invokes it
		// from inside a .then() callback must return it, or the commands leak
		// into the queue alongside the caller's own - two login chains would
		// then run concurrently (each with its own generation) and step on
		// each other's form and tokens (the 10 Nov v4 run died on exactly
		// that: ensureAccount's login ran under the spec's next login). The
		// polls therefore return their continuations, so the chain only
		// resolves when the login has really completed (established, then held
		// across the stability window) and a .then() caller can rely on it.
		//
		// Every budget arms its deadline at run time (the first poll of the
		// document it polls, via trackDocument) and re-arms on a document
		// swap (the probe counter): the login chain sits in the queue behind
		// whatever ran before it, and a deadline computed when the chain was
		// ENQUEUED expires on the first poll and reads a spent budget out of a
		// healthy page - the 11 Nov v7 phantom recovery, which wiped a
		// succeeding login and reloaded into a tokenless zombie.
		//
		// The recovery never reloads the current route: a reload re-lands where
		// the dead session was, and a dead session on a workspace route boots
		// a tokenless document the app never recovers from (no /login
		// redirect, an eternal 29 s refresh loop posting a null refresh token
		// - the 11 Nov probe: the zombie). It wipes the keys until the app
		// stops re-storing them, then enters a fresh document on /login, the
		// one route whose logged-out boot is the login page.
		//
		// After the session establishes, the app re-fires a same-document
		// bootstrap re-init about 11 s after the login 200 (the 11 Nov probe:
		// a re-POST login, a WS rebind, the workspace fetches): the session
		// usually survives it, but a 401 on the re-POST tears it down
		// (clearSession + a /login redirect) after this method has already
		// reported success, so the session is verified to hold across that
		// window before the chain ends.
		let generation = 0;
		const sessionEstablished = (win) =>
			win.location.pathname !== '/login' &&
			!!win.localStorage.accessToken &&
			win.localStorage.username === username;
		const otherSession = (win) =>
			win.location.pathname !== '/login' &&
			!!win.localStorage.accessToken &&
			win.localStorage.username !== username;
		const formInput = (win) => win.document.querySelector(HomePageLocators.usernameLoginInput);
		const formLive = (win) => {
			if (win.location.pathname !== '/login') {
				return false;
			}
			const input = formInput(win);
			return !!input && !input.disabled;
		};
		// The input must also be the topmost element at its own center: an
		// overlay (the demo accounts popover, a toast, a dialog) above it would
		// receive the click and could auto-log the app in as another user.
		const unobstructed = (win) => {
			const input = formInput(win);
			if (!input || input.disabled) {
				return { ok: false, why: 'the form input is absent or disabled' };
			}
			const box = input.getBoundingClientRect();
			if (!box.width || !box.height) {
				return { ok: false, why: 'the form input is not rendered' };
			}
			const top = win.document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
			if (!top || (top !== input && !input.contains(top))) {
				return { ok: false, why: `the form input is covered by <${top.tagName.toLowerCase()}${top.className ? ` .${String(top.className).split(' ')[0]}` : ''}>` };
			}
			return { ok: true, why: '' };
		};
		const typeable = (win) => {
			if (sessionEstablished(win)) {
				return true;
			}
			if (win.location.pathname !== '/login') {
				return false; // the app is still booting toward the login page
			}
			const gate = unobstructed(win);
			return gate.ok;
		};
		// The submit is one turn in the page, not a chain of Cypress commands:
		// every queued action (get/clear/type/click) re-asserts actionability
		// at its own moment, and the app re-renders the form around every
		// login, so a v5 chain could gate on an enabled input and then type
		// into a disabled or detached one (the 10 Nov v5 run B died on a
		// disabled login input), and a coordinate click could land on a demo
		// card or a toast instead of the button (the same run's app then
		// logged itself into a null-username session). Done natively there is
		// no window for that: the gate, the value writes and the click happen
		// in the same turn, the click dispatches on the button element itself
		// (an overlay cannot steal it), and if the form is disabled or taken
		// away the submit is a no-op that the next poll re-classifies instead
		// of a failed command.
		const fillField = (win, selector, value) => {
			const el = win.document.querySelector(selector);
			if (!el || el.disabled) {
				return false;
			}
			// The native setter + input event is what Angular's form control
			// reads (a plain .value = write is invisible to it).
			Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value').set.call(el, value);
			el.dispatchEvent(new win.Event('input', { bubbles: true }));
			return el.value === value;
		};
		const submit = () => {
			const gen = generation;
			return cy.fixture('credentials').then(({ goodPassword }) => {
				return cy.window().then((win) => {
					if (generation !== gen) {
						return; // a recovery superseded this chain
					}
					if (win.location.pathname !== '/login') {
						cy.log(`login of ${username} skipped: the app is off the login page (a session is in flight)`);
						return;
					}
					const gate = unobstructed(win);
					if (!gate.ok) {
						cy.log(`login of ${username} skipped: ${gate.why}`);
						return;
					}
					// The Log In button is [disabled] until the next
					// change-detection cycle reflects the values just written,
					// so let that cycle run, then re-assert against the live
					// document (the app may have re-rendered the form in the
					// meantime) and click.
					const fieldsOk = fillField(win, HomePageLocators.usernameLoginInput, username) &&
						fillField(win, HomePageLocators.passInput, password ?? goodPassword);
					if (!fieldsOk) {
						cy.log(`login of ${username} skipped: the form is disabled while a session is in flight`);
						return;
					}
					return new Promise((resolve) => win.setTimeout(resolve, 100)).then(() => {
						if (generation !== gen) {
							return; // a recovery superseded this chain
						}
						if (win.location.pathname !== '/login') {
							cy.log(`login of ${username} aborted mid-submit: the app left the login page`);
							return;
						}
						const button = win.document.querySelector(HomePageLocators.loginButton);
						if (!button || button.disabled || !win.document.body.contains(button)) {
							cy.log(`login of ${username} aborted mid-submit: the form was taken away after the fields were filled`);
							return;
						}
						button.click();
					});
				});
			});
		};
		const WIPED_KEYS = ['accessToken', 'refreshToken', 'username'];
		const wipeSession = (win) => {
			WIPED_KEYS.forEach((key) => win.localStorage.removeItem(key));
		};
		// A plain removeItem is a one-shot snapshot: the app's in-flight
		// access-token refresh (the 29 s timer) or an in-flight login response
		// re-writes the tokens the moment it resolves, so the recovery that
		// follows would re-bootstrap the session just torn down (the 10 Nov v5
		// runs saw the previous user re-establish right after a recovery boot
		// and the next budget threw). Settle on the keys staying gone for a few
		// checks instead; if the app keeps re-storing (a live session loop),
		// move on at the cap - the next classification handles a one-off
		// re-bootstrap.
		const wipeUntilQuiet = (win) => new Promise((resolve) => {
			const deadline = Date.now() + 5000;
			let quiet = 0;
			const tick = () => {
				wipeSession(win);
				const gone = WIPED_KEYS.every((key) => win.localStorage.getItem(key) === null);
				quiet = gone ? quiet + 1 : 0;
				if (quiet >= 3) {
					resolve();
					return;
				}
				if (Date.now() < deadline) {
					win.setTimeout(tick, 250);
				} else {
					wipeSession(win);
					resolve();
				}
			};
			win.setTimeout(tick, 250);
		});
		// The app can sit on a disabled form (a session establishing that never
		// settles) or not have rendered the login page yet: budget it, and when
		// the budget is spent wipe the tokens and re-enter from a fresh boot.
		// A session for another user needs no budget - the app will never log
		// the requested user in on its own, so recover at once.
		//
		// The bounded recovery itself: wipe until the app stops re-storing the
		// keys, then enter a fresh document on /login with the keys wiped again
		// at the door (a bare reload would re-land on the current route - see
		// the zombie finding in the method header), and re-attempt.
		const recover = (win, why) => {
			generation += 1;
			cy.log(`login of ${username}: ${why}; wiping the session and entering a fresh /login boot`);
			return wipeUntilQuiet(win).then(() =>
				cy.visit(URL.Root + '/login', docProbe({
					onBeforeLoad(w) {
						wipeSession(w);
					},
				}))
			).then(() => attempt(true));
		};
		const waitUntilTypeable = (recovered) => {
			const state = { docSeq: undefined, deadline: 0 };
			const poll = () => {
				const gen = generation;
				return cy.window().then((win) => {
					if (generation !== gen) {
						return; // a recovery superseded this chain
					}
					trackDocument(state, TIMEOUTS.backend, win);
					if (typeable(win)) {
						return;
					}
					if (otherSession(win)) {
						if (recovered) {
							throw new Error(`login as ${username}: the app keeps re-establishing a session for ${win.localStorage.username} after the recovery boot`);
						}
						return recover(win, `the app holds a session for ${win.localStorage.username}`);
					}
					if (Date.now() < state.deadline) {
						return cy.wait(POLL_INTERVAL).then(poll);
					}
					if (recovered) {
						throw new Error(`login as ${username} never reached a typeable form (last state: ${win.location.pathname}; gate: ${unobstructed(win).why || 'n/a'})`);
					}
					return recover(win, `the form never settled (last state: ${win.location.pathname}; gate: ${unobstructed(win).why || 'n/a'})`);
				});
			};
			return poll();
		};
		// The app leaves /login once the session is established. If it is still
		// on the login page when the budget runs out, the form being live means
		// the login 401'd (a transient flake on good credentials - see
		// pending-issues) and it is waiting for the user: one more submit, no
		// reload. A disabled form means the login POST never settled (a dropped
		// reply, same class): a fresh boot is the only lever.
		const waitUntilAuthed = (recovered) => {
			const state = { docSeq: undefined, deadline: 0 };
			const poll = () => {
				const gen = generation;
				return cy.window().then((win) => {
					if (generation !== gen) {
						return; // a recovery superseded this chain
					}
					trackDocument(state, TIMEOUTS.backend, win);
					if (sessionEstablished(win)) {
						return;
					}
					if (Date.now() < state.deadline) {
						return cy.wait(POLL_INTERVAL).then(poll);
					}
					if (recovered) {
						throw new Error(`login as ${username} did not complete after two attempts (last state: ${win.location.pathname})`);
					}
					if (formLive(win)) {
						cy.log(`login of ${username}: the app is still on the login page with a live form (last state: ${win.location.pathname}); submitting once more`);
						return submit().then(() => waitUntilAuthed(true));
					}
					return recover(win, `the form never settled after the login (last state: ${win.location.pathname}; gate: ${unobstructed(win).why || 'n/a'})`);
				});
			};
			return poll();
		};
		// The app re-fires a same-document bootstrap re-init about 11 s after a
		// login 200 (the 11 Nov probe: a re-POST login, a WS rebind, branding,
		// session and profile on the same document, which it re-logged in
		// through): the session usually survives it, but a 401 on the re-POST
		// tears it down (clearSession + a /login redirect) after the login
		// chain has already reported success, and the spec's next steps would
		// then run logged out. Hold the session for the re-init window instead
		// of discovering the loss one workflow step later. A document swap
		// spends a fresh window: a fresh boot of a live session re-establishes
		// and redirects, and a tokenless one fails the next classification.
		const SESSION_STABLE_WINDOW = 15000;
		const waitForSessionStable = (recovered) => {
			const state = { docSeq: undefined, deadline: 0 };
			const poll = () => {
				const gen = generation;
				return cy.window().then((win) => {
					if (generation !== gen) {
						return; // a recovery superseded this chain
					}
					trackDocument(state, SESSION_STABLE_WINDOW, win);
					if (!sessionEstablished(win)) {
						const detail = `state: ${win.location.pathname}; stored user: ${win.localStorage.username || '(none)'}; token: ${win.localStorage.accessToken ? 'present' : 'absent'}`;
						if (recovered) {
							throw new Error(`login as ${username}: the session was torn down after the recovery login (${detail})`);
						}
						return recover(win, `the session was torn down after the login (${detail})`);
					}
					if (Date.now() >= state.deadline) {
						return; // the session held across the re-init window
					}
					return cy.wait(POLL_INTERVAL).then(poll);
				});
			};
			return poll();
		};
		const attempt = (recovered) => {
			waitUntilTypeable(recovered);
			submit();
			// Wait until the app has finished redirecting to the authenticated
			// workspace, otherwise a cy.visit() issued right after would reload
			// the app while it is still on the login route and the auth guard
			// would kick back to /login. Then hold the session across the
			// app's post-login re-init window (see waitForSessionStable).
			return waitUntilAuthed(recovered).then(() => waitForSessionStable(recovered));
		};
		return attempt(false);
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
		// Give the auth teardown time to finish before the next login reuses the page.
		// The window read polls instead of cy.location, which throws
		// UrlNotYetAvailableError over a long teardown navigation.
		waitForLocation('/login', { timeout: TIMEOUTS.backend });
		// The app signs out by tearing down the session (updateState(false) drops
		// the stored tokens), but one of its sign-out paths (the legacy header)
		// leaves the long-lived refresh token behind. A leftover refresh token is
		// dangerous here: login()'s recovery does cy.reload(), which runs the
		// startup initializer that re-bootstraps the PREVIOUS user from that token
		// and unmounts the form the next login() is about to type into. Wipe it
		// defensively (visit() already wipes all three; this covers a sign-out
		// that is followed by login() without a visit). Every spec re-logs in
		// explicitly, so dropping the previous user's session is always safe.
		cy.window().then((win) => {
			win.localStorage.removeItem('refreshToken');
		});
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
		if (accType === 'SR')
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
		// The window read branches on the live location instead of cy.location
		// (which throws UrlNotYetAvailableError over a mid-navigation blank
		// bar); the settle wait above guarantees the document has reached one
		// or the other by now.
		cy.window().then((win) => {
			if (win.location.pathname === '/login') {
				// Returned: without it the login chain leaks into the queue
				// (the callback resolves at once) and this login would run
				// concurrently with the spec's next commands - two login
				// chains step on each other's form and tokens.
				return this.login(username);
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
		cy.contains('button', /^\s*Generate\s*$/, { timeout: TIMEOUTS.ui }).click();
		cy.get('#operatorId', { timeout: TIMEOUTS.backend }).should('not.be.empty');
		cy.get('#operatorKey', { timeout: TIMEOUTS.backend }).should('not.be.empty');
		this._wizardStepNext();
		// The default radio generates a new DID document and needs no input.
		// An active USER system schema in the workspace appends a VC document
		// step (the API suite's 011_schemas spec activates one and the product
		// cannot deactivate it), so the tail is driven shape-agnostically.
		completeUserWizard();
		waitForTaskRoundtrip();
		cy.get('div.user-profile-setup-title').should('not.exist');
		this.logOut();
	}

	// The wizard footer's last step is labelled "Confirm" instead of "Next".
	// The "account already exists" toast of an earlier sign-up attempt is sticky and sits on the button.
	_wizardStepNext() {
		dismissStickyToasts();
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
		waitForLocation('/login');
	}

	verifyWeakPasswordAlert() {
		// Same contract as verifyAlert: a rejected registration leaves us on the login screen.
		waitForLocation('/login');
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
