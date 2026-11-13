import { TIMEOUTS, POLL_INTERVAL } from './CustomHelpers/timeouts';

// After a page boot the app runs its workspace bootstrap and keeps the route content gated while it
// is in flight, which can take longer than the default command timeout on a loaded stack.

// Waits for a page-specific marker to be in the DOM.
export function waitForPageReady(marker) {
    cy.get(marker, { timeout: TIMEOUTS.backend });
}

// The inverse of waitForPageReady, for pages whose content stays in the DOM under a loading overlay:
// a presence marker passes while the overlay still covers the page, so wait for the overlay to go.
export function waitForPageSettled(overlayMarker) {
    cy.get('body', { timeout: TIMEOUTS.backend }).should(($body) => {
        expect($body.find(overlayMarker).length, `page still covered by its loading overlay (${overlayMarker})`).to.eq(0);
    });
}

// Polls the live window's location part until `matches` holds. A cy.location() over a long
// navigation throws UrlNotYetAvailableError while the address bar is still blank; a plain window
// read just reads what is there. The deadline is armed when the poll runs, not when it is queued.
function waitForLocationPart(part, timeout, matches, failure) {
    let deadline;
    const poll = () => cy.window().then((win) => {
        deadline ??= Date.now() + timeout;
        const value = win.location[part] || '';
        if (matches(value)) {
            return;
        }
        if (Date.now() >= deadline) {
            throw new Error(failure(value));
        }
        return cy.wait(POLL_INTERVAL).then(poll);
    });
    return poll();
}

// Waits until the location part includes `fragment`. Returns its chain.
export function waitForLocation(fragment, { part = 'pathname', timeout = TIMEOUTS.ui } = {}) {
    return waitForLocationPart(part, timeout, (value) => value.includes(fragment),
        (value) => `the location ${part} is ${value || '(blank)'} after ${timeout} ms and never included "${fragment}"`);
}

// Waits until the location part no longer includes `fragment` (the app left a route). Returns its chain.
export function waitForLocationAwayFrom(fragment, { part = 'pathname', timeout = TIMEOUTS.ui } = {}) {
    return waitForLocationPart(part, timeout, (value) => !value.includes(fragment),
        (value) => `the location ${part} is still ${value} after ${timeout} ms and never left "${fragment}"`);
}
