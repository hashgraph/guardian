/**
 * Proof 3: the Verra Project Hub CUSTOM mapping is structurally valid and is
 * consistent with the closest existing reference implementation.
 *
 * The reference is VM0033.policy, which a census of the repository shows is the
 * only policy carrying a Project Hub dataTransformationAddon (2 occurrences),
 * and the only one already carrying vcs / ccb / sdVista program sub-objects.
 *
 * Consistency is asserted structurally, not by copying: every top-level key
 * this mapping emits must also exist in the VM0033 mapping, so the ACM0010
 * slice cannot drift from the shape Verra's Project Hub expects.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { loadSlicePolicy, loadReferencePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

function transformExpression(p) {
    let found = null;
    walkBlocks(p.config, (n) => {
        if (n.blockType === 'dataTransformationAddon' && !found) found = n.expression;
    });
    assert.ok(found, 'dataTransformationAddon expression must exist');
    return found;
}

function transformExpressions(p) {
    const found = [];
    walkBlocks(p.config, (n) => {
        if (n.blockType === 'dataTransformationAddon') found.push(n.expression);
    });
    assert.ok(found.length >= 1, 'at least one dataTransformationAddon expression must exist');
    return found;
}

/** Recover the key skeleton the VM0033 mapping declares. */
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

const VM0033 = join('Methodology Library', 'Verra', 'Verified Carbon Standard (VCS)', 'VM0033', 'VM0033.policy');
const reference = loadReferencePolicy(VM0033);

function projectDescription(overrides = {}) {
    return {
        id: 'acm0010-test-project',
        projectName: 'Slice Test Farm',
        projectDescription: 'Vertical slice project',
        projectStartDate: '2026-01-01',
        creditPeriodStart: '2026-01-01',
        creditPeriodEnd: '2036-01-01',
        projectProponents: ['Slice Test Farm Ltd'],
        standardTemplate: 'VCS',
        standardTemplateName: 'Verified Carbon Standard',
        methodologyTemplateTitle: 'ACM0010 GHG emission reductions from manure management systems',
        methodologyTemplate: 'ACM0010',
        vcsProjectValidatorId: 'VCS-VAL-001',
        ccbProjectValidatorId: 'CCB-VAL-001',
        ccbStandardName: 'CCB Gold Level',
        ccbDistinctions: ['None'],
        baselineAwms: { name: 'Anaerobic Lagoon', methaneConversionFactor: 0.1 },
        livestock: [
            { type: 'Dairy Cattle', annualVolatileSolids: 68, maxMethaneProducingCapacity: 0.24 },
            { type: 'Swine', annualVolatileSolids: 53, maxMethaneProducingCapacity: 0.25 },
        ],
        monitoringYear: 2026,
        parameters: { globalWarmingPotentialCh4: 28 },
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

test('ACM0010 mapping uses the Verra sectoral scope for livestock (15)', () => {
    const out = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    assert.equal(out.projectType, '15');
    assert.notEqual(out.projectType, '14', 'must not inherit VM0033 sectoral scope 14');
});

test('the mapping emits the VCS, CCB and SDVISta program sub-objects', () => {
    const out = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    assert.ok(out.vcs && typeof out.vcs === 'object', 'vcs block required by criterion 1');
    assert.ok(out.ccb && typeof out.ccb === 'object', 'ccb block required by criterion 1');
    assert.ok('sdVista' in out, 'sdVista key required by criterion 1');
    assert.equal(out.vcs.projectValidatorId, 'VCS-VAL-001');
    assert.equal(out.ccb.projectValidatorId, 'CCB-VAL-001');
    assert.equal(out.ccb.ccbStandardName, 'CCB Gold Level');
    assert.deepEqual(out.ccb.distinctions, ['None']);
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

test('mapping is consistent with the VM0033 Project Hub reference', () => {
    const refExpr = transformExpression(reference.policy);
    const referenceKeys = referenceKeySkeleton(refExpr);
    assert.ok(referenceKeys.size > 20, `VM0033 mapping should declare many keys, got ${referenceKeys.size}`);

    const out = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    for (const key of Object.keys(out)) {
        assert.ok(referenceKeys.has(key), `key "${key}" is not present in the VM0033 Project Hub mapping`);
    }
    // the program-template sub-objects must be nested the same way
    const referenceCcbKeys = new Set(
        [...refExpr.matchAll(/ccb:\s*\{([\s\S]*?)\n\s{8}\},/g)].flatMap((m) =>
            [...m[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*):/g)].map((n) => n[1]),
        ),
    );
    for (const key of Object.keys(out.ccb)) {
        assert.ok(referenceCcbKeys.has(key), `ccb key "${key}" is not present in the VM0033 ccb block`);
    }
});

test('ACM0010 domain fields are carried into the Project Hub payload', () => {
    const out = runExpression(transformExpression(policy), { documents: [asDocument(projectDescription())] });
    assert.equal(out.projectName, 'Slice Test Farm');
    assert.equal(out.standardTemplate, 'VCS');
    assert.equal(out.methodologyTemplate, 'ACM0010');
    assert.equal(out.creditPeriod.startDate, '2026-01-01');
    assert.equal(out.creditPeriod.endDate, '2036-01-01');
    assert.deepEqual(out.projectProponents, ['Slice Test Farm Ltd']);
    assert.equal(out.projectSubmissionStatus, 'Draft');
    assert.equal(out.calculationInputs.baselineAwms[0].name, 'Anaerobic Lagoon');
    assert.equal(out.calculationInputs.livestock.length, 2);
    assert.equal(out.calculationInputs.livestock[0].type, 'Dairy Cattle');
});

test('unset inputs keep the reference skeleton null, matching VM0033 behaviour', () => {
    const out = runExpression(transformExpression(policy), {
        documents: [asDocument(projectDescription({ website: undefined, projectProponents: undefined }))],
    });
    // VM0033 pre-declares these in the json literal (website: null, projectProponents: [''])
    // and setDeepValue() skips undefined, so the key survives with its skeleton value.
    assert.equal(out.website, null, 'unset website keeps the skeleton null');
    // cross-realm value from the vm sandbox, so compare structurally
    assert.equal(JSON.stringify(out.projectProponents), JSON.stringify(['']), 'skeleton default is preserved');
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

// ---------------------------------------------------------------------------
// Monitoring Report mapping (dataTransformationAddon on monitoring report step)
// ---------------------------------------------------------------------------

function monitoringReport(overrides = {}) {
    return {
        id: 'acm0010-mr-test',
        projectName: 'Slice Test Farm',
        projectDescription: 'ACM0010 monitoring report',
        projectStartDate: '2026-01-01',
        creditPeriodStart: '2026-01-01',
        creditPeriodEnd: '2036-01-01',
        projectProponents: ['Slice Test Farm Ltd'],
        standardTemplate: 'VCS',
        standardTemplateName: 'Verified Carbon Standard',
        methodologyTemplateTitle: 'ACM0010 GHG emission reductions from manure management systems',
        methodologyTemplate: 'ACM0010',
        vcsProjectValidatorId: 'VCS-VAL-001',
        ccbProjectValidatorId: 'CCB-VAL-001',
        ccbStandardName: 'CCB Gold Level',
        ccbDistinctions: ['None'],
        monitoringYear: 2026,
        baselineEmissionsTCo2e: 206.0,
        projectEmissionsTCo2e: 5.0,
        emissionReductionsTCo2e: 201.0,
        ...overrides,
    };
}

function findMonitoringReportExpression(p) {
    let found = null;
    walkBlocks(p.config, (n) => {
        if (n.blockType === 'dataTransformationAddon' && n.tag === 'monitoring-report') {
            found = n.expression;
        }
    });
    assert.ok(found, 'monitoring-report dataTransformationAddon expression must exist');
    return found;
}

test('monitoring-report dataTransformationAddon is attached to the monitoring report block', () => {
    let addon = null;
    let parent = null;
    (function find(node) {
        if (!node || typeof node !== 'object' || addon) return;
        if (Array.isArray(node.children)) {
            for (const c of node.children) {
                if (c.blockType === 'dataTransformationAddon' && c.tag === 'monitoring-report') {
                    addon = c; parent = node; return;
                }
                find(c);
            }
        }
    })(policy.config);
    assert.ok(addon, 'policy must contain a monitoring-report dataTransformationAddon');
    assert.equal(parent.blockType, 'requestVcDocumentBlock');
    assert.equal(parent.schema, '#monitoring-report');
    assert.equal(addon.tag, 'monitoring-report', 'tag mirrors the project-description precedent');
    assert.deepEqual(addon.permissions, ['Project Proponent']);
});

test('monitoring report mapping emits the VCS, CCB and SDVISta program sub-objects', () => {
    const expr = findMonitoringReportExpression(policy);
    const out = runExpression(expr, { documents: [asDocument(monitoringReport())] });
    assert.ok(out.vcs && typeof out.vcs === 'object', 'vcs block required by criterion 1');
    assert.ok(out.ccb && typeof out.ccb === 'object', 'ccb block required by criterion 1');
    assert.ok('sdVista' in out, 'sdVista key required by criterion 1');
    assert.equal(out.projectType, '15', 'sectoral scope 15 for livestock and manure management');
});

test('monitoring report mapping carries emission reduction fields', () => {
    const expr = findMonitoringReportExpression(policy);
    const out = runExpression(expr, { documents: [asDocument(monitoringReport())] });
    assert.equal(out.calculationInputs.monitoringYear, 2026);
    assert.equal(out.calculationInputs.baselineEmissionsTCo2e, 206.0);
    assert.equal(out.calculationInputs.projectEmissionsTCo2e, 5.0);
    assert.equal(out.calculationInputs.emissionReductionsTCo2e, 201.0);
});

test('monitoring report mapping is structurally consistent with the VM0033 Project Hub reference', () => {
    const refExpr = transformExpression(reference.policy);
    const referenceKeys = referenceKeySkeleton(refExpr);
    assert.ok(referenceKeys.size > 20, `VM0033 mapping should declare many keys, got ${referenceKeys.size}`);

    const expr = findMonitoringReportExpression(policy);
    const out = runExpression(expr, { documents: [asDocument(monitoringReport())] });
    for (const key of Object.keys(out)) {
        assert.ok(referenceKeys.has(key), `key "${key}" is not present in the VM0033 Project Hub mapping`);
    }
});

test('monitoring report unset inputs keep the reference skeleton null', () => {
    const expr = findMonitoringReportExpression(policy);
    const out = runExpression(expr, {
        documents: [asDocument(monitoringReport({ website: undefined, projectProponents: undefined }))],
    });
    assert.equal(out.website, null, 'unset website keeps the skeleton null');
    assert.equal(JSON.stringify(out.projectProponents), JSON.stringify(['']), 'skeleton default is preserved');
});

