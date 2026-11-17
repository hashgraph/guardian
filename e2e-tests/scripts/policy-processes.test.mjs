import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const { createSuiteChangeStopper, policyServiceLogDir } = require('../cypress/tasks/policyProcesses.js');

describe('createSuiteChangeStopper', () => {
    it('stops the policy processes when a spec of another folder starts, not between specs of the same folder', async () => {
        let stops = 0;
        const beforeSpec = createSuiteChangeStopper(async () => { stops += 1; });

        await beforeSpec('cypress/e2e/api-tests/003_ipfs/postFile.cy.js');
        assert.equal(stops, 0, 'nothing to stop before the first suite');
        await beforeSpec('cypress/e2e/api-tests/003_ipfs/getFile.cy.js');
        assert.equal(stops, 0, 'same suite');
        await beforeSpec('cypress/e2e/api-tests/004_logs/getLogs.cy.js');
        assert.equal(stops, 1, 'new suite');
        await beforeSpec('cypress/e2e/ui-tests/specs/02_policies/iREC4.cy.js');
        await beforeSpec('cypress/e2e/ui-tests/specs/02_policies/iREC3.cy.js');
        assert.equal(stops, 2);
    });

    it('waits for the processes to stop before the spec starts', async () => {
        const events = [];
        const beforeSpec = createSuiteChangeStopper(async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            events.push('stopped');
        });
        await beforeSpec('cypress/e2e/api-tests/003_ipfs/postFile.cy.js');
        await beforeSpec('cypress/e2e/api-tests/004_logs/getLogs.cy.js');
        events.push('spec starts');
        assert.deepEqual(events, ['stopped', 'spec starts']);
    });
});

describe('policyServiceLogDir', () => {
    it('reads the policy-service logs where the services write them', () => {
        assert.equal(policyServiceLogDir({ GUARDIAN_LOG_DIR: '/runner/temp/guardian-logs' }), '/runner/temp/guardian-logs');
    });

    it('defaults to the log folder of scripts/local-guardian.sh', () => {
        const e2eDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
        assert.equal(policyServiceLogDir({}), path.join(e2eDir, '.local', 'logs'));
    });
});
