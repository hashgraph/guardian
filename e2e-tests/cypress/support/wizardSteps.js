import { TIMEOUTS } from './CustomHelpers/timeouts';
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

const WIZARD_ZONE = 'div.policy-content, div.guardian-dialog';

export const clickButtonInWizardSteps = (selector, options = {}) => {
    const { zone = WIZARD_ZONE, walkTabs = true } = options;
    const exploredTabs = [];
    const exploredSteps = [];

    const findVisible = () =>
        cy.get(zone, { includeHidden: true, log: false }).then(
            ($zone) => $zone.find(selector).toArray().find(isVisible) || null
        );

    const attemptTabs = (index, onExhausted) => {
        cy.get(`${zone} p-tab`, { includeHidden: true, log: false }).then(($tabs) => {
            const tabs = $tabs.toArray().filter(isVisible);
            if (index >= tabs.length) {
                return onExhausted();
            }
            exploredTabs.push((tabs[index].textContent || '').trim());
            cy.wrap(tabs[index], { log: false }).click({ log: false });
            cy.wrap(tabs[index], { log: false }).should('have.attr', 'aria-selected', 'true');
            return findVisible().then((el) => {
                if (el) {
                    return cy.wrap(el, { log: false }).click({ log: false });
                }
                return attemptTabs(index + 1, onExhausted);
            });
        });
    };

    const attemptSteps = (index) => {
        cy.get(`${zone} div.step-item`, { includeHidden: true, log: false }).then(($steps) => {
            const steps = $steps.toArray().filter(isVisible);
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
                    return cy.wrap(el, { log: false }).click({ log: false });
                }
                if (!walkTabs) {
                    return attemptSteps(index + 1);
                }
                return attemptTabs(0, () => attemptSteps(index + 1));
            });
        });
    };

    return findVisible().then((el) => {
        if (el) {
            return cy.wrap(el, { log: false }).click({ log: false });
        }
        if (!walkTabs) {
            return attemptSteps(0);
        }
        return attemptTabs(0, () => attemptSteps(0));
    });
};

// Clicks the wizard tab whose title equals (or, as a fallback, contains) `text`.
// Used to steer a flow to a specific tab (e.g. 'Approve VVB') before acting on it.
export const clickWizardTab = (text) => {
    return cy
        .get('div.policy-content p-tab', { includeHidden: true, timeout: TIMEOUTS.backend, log: false })
        .then(($tabs) => {
            const visible = $tabs.toArray().filter(isVisible);
            const tab =
                visible.find((el) => (el.textContent || '').trim() === text) ||
                visible.find((el) => (el.textContent || '').includes(text));
            if (!tab) {
                throw new Error(
                    `No visible wizard tab with text "${text}". ` +
                    `Visible tabs: ${visible.map((el) => (el.textContent || '').trim()).join(' | ') || 'none'}`
                );
            }
            cy.wrap(tab).click();
            return cy.wrap(tab).should('have.attr', 'aria-selected', 'true');
        });
};
