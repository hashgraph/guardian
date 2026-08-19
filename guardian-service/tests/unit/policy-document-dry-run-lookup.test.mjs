import assert from 'node:assert/strict';
import esmock from 'esmock';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { PolicyStatus } from '@guardian/interfaces';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const servicePath = path.resolve(__dirname, '../../dist/policy-engine/policy-engine.service.js');

/**
 * Document handlers resolved ids with getVCById, which reads VcDocument. A dry-run
 * policy's documents live in DryRun, keyed by dryRunId, so every such lookup missed
 * them and answered "Document not found."
 */
const source = readFileSync(
    fileURLToPath(new URL('../../src/policy-engine/policy-engine.service.ts', import.meta.url)),
    'utf8'
);

const load = (calls) => esmock(servicePath, {
    '@guardian/common': {
        DatabaseServer: Object.assign(
            class {
                constructor(dryRunId) { calls.instance.push(dryRunId); }
                async getVcDocument(filter) { return { id: filter.id, from: 'dry-run' }; }
            },
            { getVCById: async (...a) => { calls.static.push(a); return { from: 'real' }; } }
        ),
    },
});

describe('policy document lookup is dry-run aware', function () {
    // esmock re-imports the module per case
    this.timeout(60000);

    it('leaves no handler reading VcDocument directly', () => {
        const direct = source.split('DatabaseServer.getVCById(').length - 1;
        assert.equal(direct, 1, 'only findPolicyVcDocument should call getVCById');
    });

    it('reads a dry-run document from DryRun, keyed by policy id', async () => {
        const calls = { instance: [], static: [] };
        const { findPolicyVcDocument } = await load(calls);

        const vc = await findPolicyVcDocument({ id: 'policy-1', status: PolicyStatus.DRY_RUN }, 'doc-1');

        assert.equal(vc.from, 'dry-run');
        assert.deepEqual(calls.instance, ['policy-1']);
        assert.deepEqual(calls.static, []);
    });

    it('reads a published policy document from VcDocument', async () => {
        const calls = { instance: [], static: [] };
        const { findPolicyVcDocument } = await load(calls);

        const vc = await findPolicyVcDocument({ id: 'policy-1', status: PolicyStatus.PUBLISH }, 'doc-1');

        assert.equal(vc.from, 'real');
        assert.deepEqual(calls.instance, []);
        assert.deepEqual(calls.static, [['doc-1']]);
    });

    it('treats DEMO as dry-run, as isDryRunMode does', async () => {
        const calls = { instance: [], static: [] };
        const { findPolicyVcDocument } = await load(calls);

        const vc = await findPolicyVcDocument({ id: 'policy-9', status: PolicyStatus.DEMO }, 'doc-1');

        assert.equal(vc.from, 'dry-run');
        assert.deepEqual(calls.instance, ['policy-9']);
    });
});
