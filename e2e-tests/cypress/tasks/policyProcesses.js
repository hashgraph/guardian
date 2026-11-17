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

// stop-policies.mjs maps each policy process to its policy through the policy-service logs. CI writes them
// to GUARDIAN_LOG_DIR; scripts/local-guardian.sh writes them to .local/logs.
function policyServiceLogDir(env) {
    return env.GUARDIAN_LOG_DIR || path.join(__dirname, '..', '..', '.local', 'logs');
}

module.exports = { createSuiteChangeStopper, policyServiceLogDir };
