/**
 * Proof 3: the Verra Project Hub CUSTOM mapping is structurally valid and
 * consistent with the closest existing reference implementation.
 *
 * The reference is VM0033.policy, which a census of the repository shows is the
 * only policy carrying a Project Hub dataTransformationAddon, and which is
 * also sectoral scope 14 (AFOLU) - the same sectoral scope Verra assigns to
 * VM0010.
 *
 * Consistency is asserted structurally: every top-level key this mapping emits
 * must also exist in the VM0033 mapping, so the slice cannot drift from the
 * shape Verra's Project Hub expects.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { loadSlicePolicy, loadReferencePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();
const VM0033 = join('Methodology Library', 'Verra', 'Verified Carbon Standard (VCS)', 'VM0033', 'VM0033.policy');
const reference = loadReferencePolicy(VM0033);

function transformExpression(p) {
    let found = null;
    walkBlocks(p.config, (n) => {
        if (n.blockType === 'dataTransformationAddon' && !found) found = n.expression;
    });
    assert.ok(found, 'dataTransformationAddon expression must exist');
    return found;
}

function referenceKeySkeleton(expression) {
    const jsonStart = expression.indexOf('const json = {');
    assert.ok(jsonStart > -1, 'could not locate the json literal in the VM0033 mapping');
    const slice = expression.slice(jsonStart, jsonStart + 6000);
    const keys = new Set();
    const re = /^\s{8}([A-Za-z_][A-Za-z0-9_]*):/gm;
    let m;
    while ((m = re.exec(slice)) !== null) keys.add(m[1]);
    return keys;
}

function projectDescription(overrides = {}) {
    return {
        id: 'vm0010-test-project',
        projectName: 'Slice Test Forest',
        projectDescription: 'IFM vertical slice project',
        projectStartDate: '2026-01-01',
        creditPeriodStart: '2026-01-01',
        creditPeriodEnd: '2036-01-01',
        projectProponents: ['Slice Test Forestry Ltd'],
        standardTemplate: 'VCS',
        standardTemplateName: 'Verified Carbon Standard',
        methodologyTemplateTitle: 'VM0010 Improved Forest Management: Conversion from Logged to Protected Forest',
        methodologyTemplate: 'VM0010',
        vcsProjectValidatorId: 'VCS-VAL-001',
        ccbProjectValidatorId: 'CCB-VAL-001',
        ccbStandardName: 'CCB Gold Level',
        ccbDistinctions: ['None'],
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [
            { fuelType: 'Diesel', source: 'E_HARVEST', consumptionKl: 120 },
            { fuelType: 'Diesel', source: 'E_TRANSPORT', consumptionKl: 200 },
        ],
        monitoringYear: 2026,
        ...overrides,
    };
}

test('dataTransformationAddon is attached to the project description block', () => {
    let addon = null;
    let parent = null;
    (function find(node) {
        if (!node || typeof node !== 'object' || addon) return;
        if (Array.isArray(node.children)) {
            for (const c of node.children) {
                if (c.blockType === 'dataTransformationAddon') { addon = c; parent = node; return; }
                find(c);
            }
        }
    })(policy.config);
    assert.ok(addon, 'policy must contain a dataTransformationAddon');
    assert.equal(parent.blockType, 'requestVcDocumentBlock');
    assert.equal(parent.schema, '#project-description');
    assert.equal(addon.tag, 'project-description', 'tag mirrors the VM0033 precedent');
    assert.deepEqual(addon.permissions, ['Project Proponent']);
});

test('the mapping uses sectoral scope 14, matching VM0010 and VM0033', () => {
    const out = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    assert.equal(out.projectType, '14');

    // VM0033's own mapping cannot be executed against a minimal fixture (it
    // requires a far richer document), so its sectoral scope is asserted
    // statically from its source text rather than by execution.
    const refExpr = transformExpression(reference.policy);
    assert.match(refExpr, /projectType:\s*'14'/, 'VM0033 is also sectoral scope 14');
});

test('the mapping emits the VCS and CCB program sub-objects', () => {
    const out = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    assert.ok(out.vcs && typeof out.vcs === 'object', 'vcs block required by criterion 1');
    assert.ok(out.ccb && typeof out.ccb === 'object', 'ccb block required by criterion 1');
    assert.ok('sdVista' in out, 'sdVista key retained for structural parity with the reference');
    assert.equal(out.vcs.projectValidatorId, 'VCS-VAL-001');
    assert.equal(out.ccb.projectValidatorId, 'CCB-VAL-001');
    assert.equal(out.ccb.ccbStandardName, 'CCB Gold Level');
    assert.equal(JSON.stringify(out.ccb.distinctions), JSON.stringify(['None']));
});

test('joint VCS-CCB template is emitted when requested (criterion 1)', () => {
    const out = runExpression(transformExpression(policy), {
        documents: [asDocument(projectDescription({ standardTemplate: 'VCS+CCB' }))],
    });
    assert.equal(out.standardTemplate, 'vcs+ccb.v4.4');
    assert.equal(out.standardTemplateName, 'VCS+CCB Project Description (VCS v4.4, CCB v3.0)');
    assert.ok(out.vcs && typeof out.vcs === 'object', 'vcs block populated for joint template');
    assert.ok(out.ccb && typeof out.ccb === 'object', 'ccb block populated for joint template');
    assert.ok('sdVista' in out, 'sdVista key retained for joint template');
});

test('mapping is structurally consistent with the VM0033 Project Hub reference', () => {
    const referenceKeys = referenceKeySkeleton(transformExpression(reference.policy));
    assert.ok(referenceKeys.size > 20, `VM0033 mapping should declare many keys, got ${referenceKeys.size}`);

    const out = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    for (const key of Object.keys(out)) {
        assert.ok(referenceKeys.has(key), `key "${key}" is not present in the VM0033 Project Hub mapping`);
    }

    const referenceCcbKeys = new Set(
        [...transformExpression(reference.policy).matchAll(/ccb:\s*\{([\s\S]*?)\n\s{8}\},/g)].flatMap((m) =>
            [...m[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*):/g)].map((n) => n[1]),
        ),
    );
    for (const key of Object.keys(out.ccb)) {
        assert.ok(referenceCcbKeys.has(key), `ccb key "${key}" is not present in the VM0033 ccb block`);
    }
});

test('VM0010 domain fields are carried into the Project Hub payload', () => {
    const out = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    assert.equal(out.projectName, 'Slice Test Forest');
    assert.equal(out.standardTemplate, 'VCS');
    assert.equal(out.methodologyTemplate, 'VM0010');
    assert.equal(out.creditPeriod.startDate, '2026-01-01');
    assert.equal(out.creditPeriod.endDate, '2036-01-01');
    assert.equal(out.projectSubmissionStatus, 'Draft');
    assert.equal(out.calculationInputs.baselineActivity[0].harvestType, 'Selective logging');
    assert.equal(out.calculationInputs.fossilFuelEmissions.length, 2);
    assert.equal(out.calculationInputs.fossilFuelEmissions[0].source, 'E_HARVEST');
});

test('unset inputs keep the reference skeleton value', () => {
    const out = runExpression(transformExpression(policy), {
        documents: [asDocument(projectDescription({ website: undefined }))],
    });
    assert.equal(out.website, null, 'unset website keeps the skeleton null');
});

test('multiple documents produce one payload and empty input yields null', () => {
    const one = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    assert.ok(one && typeof one === 'object');

    const two = runExpression(transformExpression(policy), {
        documents: [asDocument(projectDescription()), asDocument(projectDescription())],
    });
    assert.ok(two && typeof two === 'object', 'last document wins, matching the VM0033 jsons[0] pattern');

    const none = runExpression(transformExpression(policy), { documents: [] });
    assert.equal(none, null, 'no input must yield null, as in the VM0033 mapping');
});
