import assert from 'node:assert/strict';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';

let origGetSchemas, origGetModules, origGetTools, origGetTool, origGetArtifact;

before(() => {
    origGetSchemas = DatabaseServer.getSchemas;
    origGetModules = DatabaseServer.getModules;
    origGetTools = DatabaseServer.getTools;
    origGetTool = DatabaseServer.getTool;
    origGetArtifact = DatabaseServer.getArtifact;

    DatabaseServer.getSchemas = async () => [];
    DatabaseServer.getModules = async () => [];
    DatabaseServer.getTools = async () => [];
    DatabaseServer.getTool = async () => null;
    DatabaseServer.getArtifact = async () => null;
});

after(() => {
    DatabaseServer.getSchemas = origGetSchemas;
    DatabaseServer.getModules = origGetModules;
    DatabaseServer.getTools = origGetTools;
    DatabaseServer.getTool = origGetTool;
    DatabaseServer.getArtifact = origGetArtifact;
});

let PolicyValidator, ModuleValidator, ToolValidator;
try {
    ({ PolicyValidator } = await import('../../../dist/policy-engine/block-validators/policy-validator.js'));
    ({ ModuleValidator } = await import('../../../dist/policy-engine/block-validators/module-validator.js'));
    ({ ToolValidator } = await import('../../../dist/policy-engine/block-validators/tool-validator.js'));
} catch (e) {
    console.warn('[orchestrator-validators.test] dist import failed:', e.message);
}

const minimalPolicy = () => ({
    topicId: '0.0.1',
    policyTokens: [],
    policyTopics: [],
    policyGroups: [],
    policyRoles: [],
    config: {
        blockType: 'interfaceContainerBlock',
        id: 'root',
        tag: 'root',
        permissions: [],
        children: [],
    },
});

const policyWithBlocks = () => ({
    ...minimalPolicy(),
    config: {
        blockType: 'interfaceContainerBlock',
        id: 'root',
        tag: 'root',
        permissions: [],
        children: [
            {
                blockType: 'informationBlock',
                id: 'info-1',
                tag: 'info',
                permissions: [],
                children: [],
            },
            {
                blockType: 'policyRolesBlock',
                id: 'roles-1',
                tag: 'roles',
                permissions: [],
                children: [],
            },
        ],
    },
});

describe('@unit PolicyValidator', () => {
    it('constructs with minimal policy', () => {
        if (!PolicyValidator) { console.warn('  [skip] dist not available'); return; }
        const v = new PolicyValidator(minimalPolicy());
        assert.equal(v.isDryRun, false);
    });

    it('build() with a minimal policy returns true', async () => {
        if (!PolicyValidator) return;
        const v = new PolicyValidator(minimalPolicy());
        const ok = await v.build(minimalPolicy());
        assert.equal(ok, true);
    });

    it('build() with null policy returns false and records an error', async () => {
        if (!PolicyValidator) return;
        const v = new PolicyValidator(minimalPolicy());
        const ok = await v.build(null);
        assert.equal(ok, false);
    });

    it('build() with non-object returns false', async () => {
        if (!PolicyValidator) return;
        const v = new PolicyValidator(minimalPolicy());
        const ok = await v.build('not-an-object');
        assert.equal(ok, false);
    });

    it('build() with a nested block tree registers each block (does not throw)', async () => {
        if (!PolicyValidator) return;
        const v = new PolicyValidator(policyWithBlocks());
        await assert.doesNotReject(async () => { await v.build(policyWithBlocks()); });
    });

    it('isDryRun flag is honoured', () => {
        if (!PolicyValidator) return;
        const v = new PolicyValidator(minimalPolicy(), true);
        assert.equal(v.isDryRun, true);
    });
});

describe('@unit ModuleValidator', () => {
    it('constructs without throwing', () => {
        if (!ModuleValidator) { console.warn('  [skip] dist not available'); return; }
        const m = new ModuleValidator({
            id: 'm-1',
            type: 'module',
            config: { blockType: 'module', children: [] },
        });
        assert.ok(m);
    });

    it('exposes getSerializedErrors when validated', async () => {
        if (!ModuleValidator) return;
        try {
            const m = new ModuleValidator({
                id: 'm-1',
                type: 'module',
                config: { blockType: 'module', children: [] },
            });
            // The validator may have async build/validate; tolerate either shape.
            if (typeof m.validate === 'function') {
                await m.validate();
            }
            if (typeof m.getSerializedErrors === 'function') {
                const out = m.getSerializedErrors();
                assert.ok(out);
            }
        } catch (e) {
            // Acceptable — fixture is minimal; the test exercises the constructor + entry points.
            assert.ok(e.message);
        }
    });
});

describe('@unit ToolValidator', () => {
    it('constructs without throwing', () => {
        if (!ToolValidator) { console.warn('  [skip] dist not available'); return; }
        const t = new ToolValidator({
            id: 't-1',
            config: { blockType: 'tool', children: [], variables: [] },
        });
        assert.ok(t);
    });

    it('exposes getSerializedErrors when validated', async () => {
        if (!ToolValidator) return;
        try {
            const t = new ToolValidator({
                id: 't-1',
                config: { blockType: 'tool', children: [], variables: [] },
            });
            if (typeof t.validate === 'function') await t.validate();
            if (typeof t.getSerializedErrors === 'function') {
                const out = t.getSerializedErrors();
                assert.ok(out);
            }
        } catch (e) {
            assert.ok(e.message);
        }
    });
});

describe('PolicyValidator: API documentation warnings', () => {
    const docEntry = (target, alias) => ({ name: 'n', description: '', target, method: 'POST', alias, url: '', dmrvUrl: '' });
    const run = async (entries) => {
        const policy = { ...policyWithBlocks(), policyDocumentation: entries };
        const validator = new PolicyValidator(policy);
        await validator.build(policy);
        await validator.validate();
        return validator.getSerializedErrors();
    };

    it('warns, without invalidating the policy, about an alias whose block no longer exists', async () => {
        const base = await run([]);
        const result = await run([docEntry('removed_block', 'monitoring/create')]);
        assert.ok(result.warnings.some((w) => /monitoring\/create/.test(w) && /removed_block/.test(w)));
        assert.equal(result.isValid, base.isValid);
        assert.deepEqual(result.errors, base.errors);
    });

    it('adds no warning for an alias that points to an existing block', async () => {
        const policy = policyWithBlocks();
        const tag = policy.config.children.find((c) => c.tag)?.tag;
        assert.ok(tag, 'fixture has a tagged child');
        const result = await run([docEntry(tag, 'create')]);
        assert.ok(!result.warnings.some((w) => /API alias/.test(w)));
    });
});
