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
//   3. otherwise walks the visible `div.step-item`s;
//   4. throws, listing everything it explored, when the control is nowhere.

const isVisible = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
};

const WIZARD_ZONE = 'div.policy-content, div.guardian-dialog';

export const clickButtonInWizardSteps = (selector, options = {}) => {
    const { zone = WIZARD_ZONE, settleMs = 2000, walkTabs = true } = options;
    const exploredTabs = [];
    const exploredSteps = [];

    const findVisible = () =>
        cy.get(zone, { includeHidden: true, log: false }).then(
            ($zone) => $zone.find(selector).toArray().find(isVisible) || null
        );

    const attemptTabs = (index) => {
        cy.get(`${zone} p-tab`, { includeHidden: true, log: false }).then(($tabs) => {
            const tabs = $tabs.toArray().filter(isVisible);
            if (index >= tabs.length) {
                return attemptSteps(0);
            }
            exploredTabs.push((tabs[index].textContent || '').trim());
            cy.wrap(tabs[index], { log: false }).click({ log: false });

            cy.wait(settleMs, { log: false });
            return findVisible().then((el) => {
                if (el) {
                    return cy.wrap(el, { log: false }).click({ log: false });
                }
                return attemptTabs(index + 1);
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
            cy.wrap(steps[index], { log: false }).click({ log: false });

            cy.wait(settleMs, { log: false });
            return findVisible().then((el) => {
                if (el) {
                    return cy.wrap(el, { log: false }).click({ log: false });
                }
                return attemptSteps(index + 1);
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
        return attemptTabs(0);
    });
};

// Clicks the wizard tab whose title equals (or, as a fallback, contains) `text`.
// Used to steer a flow to a specific tab (e.g. 'Approve VVB') before acting on it.
export const clickWizardTab = (text) => {
    return cy
        .get('div.policy-content p-tab', { includeHidden: true, timeout: 30000, log: false })
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
            return cy.wrap(tab).click();
        })
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- settle time for the switched tab body to render
        .then(() => cy.wait(2000));
};
