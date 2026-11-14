const path = require('path');

// A suite is a spec folder (api-tests/003_ipfs, ui-tests/specs/02_policies, policy-tests/cdm). Specs of
// different suites must not depend on each other, so the policy processes a suite started can be stopped
// before the next suite begins.
function createSuiteChangeStopper(stopPolicies) {
    let currentSuite = null;
    return async (specPath) => {
        const suite = path.dirname(specPath);
        if (currentSuite !== null && suite !== currentSuite) {
            await stopPolicies();
        }
        currentSuite = suite;
    };
}

module.exports = { createSuiteChangeStopper };
