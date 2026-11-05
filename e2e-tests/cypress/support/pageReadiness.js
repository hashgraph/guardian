import { TIMEOUTS, POLL_INTERVAL } from './CustomHelpers/timeouts';
// After a full page boot the app runs its workspace bootstrap (session, profile,
// notifications, per-service state) and keeps the route content gated while it
// is in flight. A single hung one-shot fetch in that bootstrap (the gateway
// auth-guard reply is a known mode - see pending-issues) leaves the page on a
// spinner forever: every page-specific control stays absent and the first
// cy.get for one times out. Nothing on the page resolves the hang; the only
// lever is a fresh page boot, which re-issues the whole bootstrap (a new
// delivery lottery for every one-shot fetch).
//
// Give the marker a budget per attempt, reload between attempts, then let one
// final standard assertion fail loudly if the marker never appeared.
export function waitForPageReady(marker, attempts = 3) {
	const runAttempt = (remaining) => {
		const deadline = Date.now() + TIMEOUTS.backend;
		const poll = () => {
			cy.window().then((win) => {
				if (win.document.querySelector(marker)) {
					return; // the page rendered within the budget
				}
				if (Date.now() >= deadline) {
					if (remaining > 1) {
						cy.reload().then(() => runAttempt(remaining - 1));
					}
					return;
				}
				cy.wait(POLL_INTERVAL).then(poll);
			});
		};
		poll();
	};
	runAttempt(attempts);
	// Definitive assertion: fails loudly (and screenshots) if the marker never appeared
	cy.get(marker, { timeout: TIMEOUTS.ui });
}

export default waitForPageReady;
