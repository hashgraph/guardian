import { TIMEOUTS, POLL_INTERVAL } from './CustomHelpers/timeouts';
import { waitForLoading } from './checkingMethods';
// Navigation helpers for the policy UI (the policy-viewer wizard).
//
// A policy renders as `div.policy-content` containing a progress tracker
// (`div.step-item` per step) and the active step body (`div.policy-container-body`).
// Which step a policy opens on is not guaranteed - the viewer restores the last
// visited step per user - so flows must not assume a position. Step bodies may also
// contain nested tab containers (`p-tab` buttons; only the active tab body is in the
// DOM). Dynamic dialogs (request forms) are appended to the body, outside the
// content zone, so the zone is a selector group by default.
//
// clickButtonInWizardSteps(selector)
//   1. probes the zone for a visible element matching `selector` and clicks it;
//   2. otherwise walks the visible `p-tab`s (clicking each once, re-probing after
//      each switch);
//   3. otherwise walks the visible `div.step-item`s, walking the tabs of each step too;
//   4. throws, listing everything it explored, when the control is nowhere.

// Layout metrics (getBoundingClientRect) read zero in a backgrounded window, so
// visibility is decided from the DOM and computed style only.
const isVisible = (el) => {
    if (!el.isConnected) {
        return false;
    }
    const style = el.ownerDocument.defaultView.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
};

// How long a freshly opened tab gets to render its controls before the next tab is tried.
const TAB_SETTLE = 3000;

const WIZARD_ZONE = 'div.policy-content, div.guardian-dialog';

// `${zone} p-tab` would only prefix the last member of a selector group.
const withinZone = (zone, selector) => zone.split(',').map((part) => `${part.trim()} ${selector}`).join(', ');

export const clickButtonInWizardSteps = (selector, options = {}) => {
    const { zone = WIZARD_ZONE, walkTabs = true } = options;
    const exploredTabs = [];
    const exploredSteps = [];

    const findVisible = () =>
        cy.get(zone, { includeHidden: true, log: false }).then(
            ($zone) => $zone.find(selector).toArray().find(isVisible) || null
        );

    // Re-queried at click time: the control is re-rendered when the policy refreshes its data, and a
    // reference found earlier would be detached by then.
    const clickFirstVisible = () =>
        cy.get(withinZone(zone, selector), { includeHidden: true, log: false })
            .filter((_, candidate) => isVisible(candidate))
            .first()
            .click({ log: false });

    // The blocks of a policy render one after another, so the control may not be there yet when the
    // page is ready: give the first probe a bounded time before concluding it is on another tab or step.
    const findVisibleWithin = (deadline) => findVisible().then((el) => {
        if (el || Date.now() >= deadline) {
            return el;
        }
        return cy.wait(POLL_INTERVAL, { log: false }).then(() => findVisibleWithin(deadline));
    });

    const attemptTabs = (index, onExhausted) => {
        cy.get(withinZone(zone, 'p-tab'), { includeHidden: true, log: false }).then(($tabs) => {
            const tabs = $tabs.toArray().filter(isVisible);
            if (index >= tabs.length) {
                return onExhausted();
            }
            exploredTabs.push((tabs[index].textContent || '').trim());
            cy.wrap(tabs[index], { log: false }).click({ log: false });
            cy.wrap(tabs[index], { log: false }).should('have.attr', 'aria-selected', 'true');
            waitForLoading();
            return findVisibleWithin(Date.now() + TAB_SETTLE).then((el) => {
                if (el) {
                    return clickFirstVisible();
                }
                return attemptTabs(index + 1, onExhausted);
            });
        });
    };

    const attemptSteps = (index) => {
        // A policy without a progress tracker has no steps: read the DOM instead of waiting for them.
        cy.get('body', { log: false }).then(($body) => {
            const steps = $body.find(withinZone(zone, 'div.step-item')).toArray().filter(isVisible);
            if (index >= steps.length) {
                throw new Error(
                    `No visible "${selector}" control in the wizard. ` +
                    `Tabs explored: ${exploredTabs.join(' | ') || 'none'}. ` +
                    `Steps explored: ${exploredSteps.join(' | ') || 'none'}. ` +
                    `Remaining steps: ${steps.map((s) => (s.textContent || '').trim()).join(' | ') || 'none'}`
                );
            }
            exploredSteps.push((steps[index].textContent || '').trim());
            // only a reachable step navigates when clicked; it then becomes the active one
            const reachable = steps[index].classList.contains('reach');
            cy.wrap(steps[index], { log: false }).click({ log: false });
            if (reachable) {
                cy.wrap(steps[index], { log: false }).should('have.class', 'active');
            }
            return findVisible().then((el) => {
                if (el) {
                    return clickFirstVisible();
                }
                if (!walkTabs) {
                    return attemptSteps(index + 1);
                }
                return attemptTabs(0, () => attemptSteps(index + 1));
            });
        });
    };

    return cy.then(() => findVisibleWithin(Date.now() + TIMEOUTS.ui)).then((el) => {
        if (el) {
            return clickFirstVisible();
        }
        if (!walkTabs) {
            return attemptSteps(0);
        }
        return attemptTabs(0, () => attemptSteps(0));
    });
};

// Opens the step of the policy navigation (the "Workflow" rail) whose label equals (or, as a fallback,
// contains) `text`, ignoring case, and waits until it is the active one. Used to steer a flow to a
// specific step (e.g. 'VVBs') before acting on it. A step opens only once the policy reports
// it reachable (class `reach`), which can lag behind the action that unlocks it, so wait for that
// first; a step that never becomes reachable fails with the labels that were visible.
export const clickWizardTab = (text) => {
    const wanted = text.toLowerCase();
    const labelOf = (el) => (el.querySelector('.step-label')?.textContent || '').trim().toLowerCase();
    const findStep = ($steps) => {
        const visible = $steps.toArray().filter(isVisible);
        return {
            step: visible.find((el) => labelOf(el) === wanted) || visible.find((el) => labelOf(el).includes(wanted)),
            labels: visible.map(labelOf),
        };
    };
    cy.get('div.step-item', { includeHidden: true, timeout: TIMEOUTS.backend, log: false }).should(($steps) => {
        const { step, labels } = findStep($steps);
        expect(step, `a visible policy step labelled "${text}" (visible: ${labels.join(' | ') || 'none'})`).to.exist;
        expect(step.classList.contains('reach') || step.classList.contains('active'), `step "${text}" reachable or active`).to.eq(true);
    });
    return cy.get('div.step-item', { includeHidden: true, log: false }).then(($steps) => {
        const { step } = findStep($steps);
        if (!step.classList.contains('active')) {
            cy.wrap(step).click();
        }
        return cy.wrap(step).should('have.class', 'active');
    });
};
