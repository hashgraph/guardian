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
// The ladder is that lever as a reusable budget: poll `settled(win)` (a
// boolean over the live document) until it holds or the per-attempt budget
// runs out, then reload and try again, `attempts` times in all. Each waiter
// ends with one standard assertion that fails loudly (and screenshots) if the
// budget was spent without settling.
//
// Two properties the 11 Nov probe runs forced on every budget here. First, a
// document swap (a reload the wait queued, or one the app issues on a
// permission update) starts a FRESH bootstrap, so the budget is per document:
// the probe below is a monotonically increasing counter in sessionStorage
// (the only storage a document and its same-tab successor both see), advanced
// by every navigation command the ladder queues and read by every poll; a
// swapped document re-arms the deadline to a full window. Second, a deadline
// is armed at the document's first poll - never at enqueue time: the wait's
// commands can sit in the queue for a long time behind whatever ran before
// them (a 115 s task round trip), and an enqueue-time deadline expires on the
// first poll and reads a spent budget out of a healthy page, which is exactly
// the phantom recovery that wiped a succeeding login on 11 Nov and reloaded
// into a tokenless zombie the app never recovers from.

// Exported: page objects budget a document state of their own through it
// (a row list, an overlay); the two waits below are its selector- and
// overlay-shaped clients. `perAttempt` stretches the per-attempt budget for
// slow states a 20 s window does not cover (an async task round trip).

// The document identity probe: a per-tab counter that survives full-page
// navigations. Advanced from the document that is about to be destroyed
// (cy.visit: its onBeforeLoad; cy.reload: takes no load callback at all -
// Loggable & Timeoutable only - so a preceding window step); the document
// that follows reads the advanced value, and a poll seeing a different value
// than the document it budgeted knows a swap happened. A document the app
// reloads on its own (a permission update) inherits the counter without
// advancing it, so it cannot fake a swap.
const DOC_SEQ_KEY = '__cypressDocSeq';

function readDocSeq(win) {
    const raw = win.sessionStorage.getItem(DOC_SEQ_KEY);
    return raw === null ? null : Number(raw);
}

function advanceDocSeq(win) {
    const current = readDocSeq(win);
    win.sessionStorage.setItem(DOC_SEQ_KEY, String((current ?? 0) + 1));
}

// Merges the probe into a cy.visit options object: the page objects'
// full-document boots and the login ladder's recovery visit pass theirs
// through it, so every document the ladder can enter carries a fresh counter.
export function docProbe(options = {}) {
    const onBeforeLoad = options.onBeforeLoad;
    return {
        ...options,
        onBeforeLoad(win) {
            advanceDocSeq(win);
            if (onBeforeLoad) {
                onBeforeLoad(win);
            }
        },
    };
}

// A cy.reload() that advances the document counter (see docProbe for why the
// advance must happen from the test side: cy.reload() accepts no load
// callback). Returns its chain.
export function reloadProbed() {
    cy.window().then((win) => advanceDocSeq(win));
    return cy.reload();
}

// Arms - and on a document swap, re-arms - the deadline a wait spends on the
// current document. `state` carries { docSeq, deadline, attemptsLeft? };
// attemptsLeft is undefined for waits whose recovery is bounded elsewhere
// (the login ladder bounds it with its recovered flag) and the swap then
// always re-arms; with a counter, a swap spends one attempt, and a swap that
// finds no attempt left keeps the old deadline so the wait fails loudly
// instead of booting documents forever.
export function trackDocument(state, perAttempt, win) {
    const seq = readDocSeq(win);
    if (state.docSeq === undefined) {
        state.docSeq = seq;
        state.deadline = Date.now() + perAttempt;
        return;
    }
    if (seq !== state.docSeq) {
        state.docSeq = seq;
        if (state.attemptsLeft === undefined || state.attemptsLeft > 0) {
            if (state.attemptsLeft !== undefined) {
                state.attemptsLeft -= 1;
            }
            state.deadline = Date.now() + perAttempt;
        }
    }
}

// Polls the live window's location part until it includes `fragment`. A
// cy.location() over a long navigation throws UrlNotYetAvailableError while
// the address bar is still blank; a plain window read just reads what is
// there, so this is the gate for route transitions that outlast a single
// command retry. Returns its chain.
export function waitForLocation(fragment, { part = 'pathname', timeout = TIMEOUTS.ui } = {}) {
    const deadline = Date.now() + timeout;
    const poll = () => {
        cy.window().then((win) => {
            if ((win.location[part] || '').includes(fragment)) {
                return;
            }
            if (Date.now() >= deadline) {
                throw new Error(`the location ${part} is ${win.location[part] || '(blank)'} after ${timeout} ms and never included "${fragment}"`);
            }
            return cy.wait(POLL_INTERVAL).then(poll);
        });
    };
    return poll();
}

// The inverse of waitForLocation: the location part must no longer include
// `fragment` (the app left a route). Returns its chain.
export function waitForLocationAwayFrom(fragment, { part = 'pathname', timeout = TIMEOUTS.ui } = {}) {
    const deadline = Date.now() + timeout;
    const poll = () => {
        cy.window().then((win) => {
            if (!(win.location[part] || '').includes(fragment)) {
                return;
            }
            if (Date.now() >= deadline) {
                throw new Error(`the location ${part} is still ${win.location[part]} after ${timeout} ms and never left "${fragment}"`);
            }
            return cy.wait(POLL_INTERVAL).then(poll);
        });
    };
    return poll();
}

export function withReloadBudget(settled, attempts, perAttempt = TIMEOUTS.backend) {
    const state = { attemptsLeft: attempts, docSeq: undefined, deadline: 0 };
    const poll = () => {
        cy.window().then((win) => {
            trackDocument(state, perAttempt, win);
            if (settled(win)) {
                return; // the page settled within the budget
            }
            if (Date.now() >= state.deadline) {
                if (state.attemptsLeft > 0) {
                    return reloadProbed().then(poll);
                }
                return; // budget spent; the caller's final assertion fails loudly
            }
            return cy.wait(POLL_INTERVAL).then(poll);
        });
    };
    return poll();
}

export function waitForPageReady(marker, attempts = 3) {
    withReloadBudget((win) => !!win.document.querySelector(marker), attempts);
    // Definitive assertion: fails loudly (and screenshots) if the marker never appeared
    cy.get(marker, { timeout: TIMEOUTS.ui });
}

// The inverse of waitForPageReady, for the current app base where the route
// content stays in the DOM and the loading state is an overlay rendered on top
// of it: a presence marker passes while the overlay covers the page (which is
// exactly the frozen state - a dropped one-shot reply, see pending-issues), so
// the readiness gate has to wait for the overlay to be gone instead.
export function waitForPageSettled(overlayMarker, attempts = 3) {
    withReloadBudget((win) => !win.document.querySelector(overlayMarker), attempts);
    cy.get('body').should(($body) => {
        expect($body.find(overlayMarker).length, `page still covered by its loading overlay (${overlayMarker})`).to.eq(0);
    }, TIMEOUTS.ui);
}

// The async task pages (/task/:id, AsyncProgressComponent) complete on a
// one-shot task GET plus a single WebSocket push: there is no polling, the
// push is user-gated on a plain Subject with no replay, and a token refresh
// that rebinds the socket to a rejected token delivers it to no one - a task
// that completed server-side then parks the app on /task/:id forever (see
// pending-issues/registration-wizard-stalls-when-the-task-result-is-lost.md).
// The only test lever is a reload: it re-issues the task GET, which returns
// the result once it exists, and the app navigates on. Each budget is a
// real-timer poll (no retry-until-timeout trap); after the last budget a
// standard assertion fails loudly, and the task id stays in the message.
export function waitForTaskRoundtripWithRecovery(reloads = 2, perAttempt = TIMEOUTS.longOperation) {
    waitForLocation('/task', { timeout: TIMEOUTS.backend });
    const state = { attemptsLeft: reloads, docSeq: undefined, deadline: 0 };
    const poll = () => {
        cy.window().then((win) => {
            trackDocument(state, perAttempt, win);
            if (!win.location.pathname.includes('/task')) {
                return; // the app navigated on - round trip complete
            }
            if (Date.now() >= state.deadline) {
                if (state.attemptsLeft > 0) {
                    return reloadProbed().then(poll);
                }
                return;
            }
            return cy.wait(POLL_INTERVAL).then(poll);
        });
    };
    poll();
    // The final assertion reads the live window rather than cy.location: a
    // page still mid-navigation has a blank address bar, and a window read
    // cannot throw on one. It retries instead of deciding on a single sample,
    // because the navigation away from /task/:id can be in flight.
    const deadline = Date.now() + TIMEOUTS.ui;
    const check = () => {
        cy.window().then((win) => {
            const path = win.location.pathname || '';
            if (!path.includes('/task')) {
                return;
            }
            if (Date.now() >= deadline) {
                throw new Error(`the app never left ${path} after ${reloads + 1} budgets of ${Math.round(perAttempt / 1000)} s each: the task completed server-side but the result push was lost client-side (see pending-issues/registration-wizard-stalls-when-the-task-result-is-lost.md)`);
            }
            return cy.wait(POLL_INTERVAL).then(check);
        });
    };
    return check();
}

export default waitForPageReady;
