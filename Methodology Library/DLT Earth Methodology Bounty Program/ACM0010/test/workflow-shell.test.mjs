/**
 * Deterministic local validation of the ACM0010 workflow shell.
 *
 * Read-only. Inspects the packaged ACM0010.policy and asserts that the workflow
 * is internally consistent, fail-closed, and free of references that would
 * depend on unresolved maintainer answers.
 *
 * This module deliberately asserts nothing about methodology *values*; those are
 * covered by test/calculate-baseline-ch4.test.mjs. It asserts that the workflow
 * wiring around the verified calculations is sound.
 *
 * Style follows the existing test modules: node:test + node:assert/strict, no
 * dependencies, helpers reused from ./_artifact.mjs.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, repoBlockTypeCensus } from './_artifact.mjs';

const { entries, policy } = loadSlicePolicy();

const EXPECTED_STAGE_TAGS = [
    'acm0010_stage_identification',
    'acm0010_stage_quantification',
    'acm0010_stage_record',
    'acm0010_stage_monitoring',
    'acm0010_stage_vvb',
    'acm0010_stage_vvb_approval',
];

const PP_STAGE_TAGS = EXPECTED_STAGE_TAGS.filter(
    (t) => t !== 'acm0010_stage_vvb' && t !== 'acm0010_stage_vvb_approval'
);

const CALC_TAG = 'acm0010_calculate_baseline_ch4';
const PD_TAG = 'acm0010_project_description';
const RECORD_TAG = 'acm0010_calculation_record';
const MONITORING_TAG = 'acm0010_monitoring_report';
const VVB_VERIFY_TAG = 'acm0010_vvb_verify_report';

const SCHEMA_IRIS = [...entries.keys()]
    .filter((n) => n.startsWith('schemas/') && n.endsWith('.json'))
    .map((n) => `#${n.replace('schemas/#', '').replace('.json', '')}`);

function blocksByTag() {
    const map = new Map();
    walkBlocks(policy.config, (n) => {
        if (n.tag) map.set(n.tag, n);
    });
    return map;
}

const byTag = blocksByTag();

// ---------------------------------------------------------------------------
// Stage structure
// ---------------------------------------------------------------------------

test('the workflow exposes exactly the six declared stages, in order', () => {
    const stageTags = (policy.config.children || [])
        .filter((c) => c.blockType === 'interfaceContainerBlock')
        .map((c) => c.tag);

    assert.deepEqual(stageTags, EXPECTED_STAGE_TAGS);
});

test('every block tag in the workflow is unique', () => {
    const tags = [];
    walkBlocks(policy.config, (n) => { if (n.tag) tags.push(n.tag); });
    const unique = new Set(tags);
    assert.equal(unique.size, tags.length, `duplicate tags: ${tags.filter((t, i) => tags.indexOf(t) !== i)}`);
});

test('each stage carries a human-readable title', () => {
    for (const tag of EXPECTED_STAGE_TAGS) {
        const stage = byTag.get(tag);
        assert.ok(stage, `stage ${tag} must exist`);
        assert.ok(stage.uiMetaData && typeof stage.uiMetaData.title === 'string' && stage.uiMetaData.title.length > 0,
            `stage ${tag} must have a non-empty title`);
    }
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test('policyNavigation resolves only to blocks that exist in the workflow', () => {
    const navigation = policy.policyNavigation || [];
    assert.ok(Array.isArray(navigation) && navigation.length > 0, 'policyNavigation must be present');

    for (const role of navigation) {
        for (const step of role.steps || []) {
            assert.ok(byTag.has(step.block), `navigation step "${step.name}" references missing block ${step.block}`);
            assert.ok(typeof step.level === 'number' && step.level >= 1, `step ${step.name} needs a level`);
        }
    }
});

test('the Project Proponent navigation exposes every Project Proponent stage', () => {
    const pp = (policy.policyNavigation || []).find((r) => r.role === 'Project Proponent');
    assert.ok(pp, 'Project Proponent navigation must exist');
    const referenced = new Set((pp.steps || []).map((s) => s.block));
    for (const tag of PP_STAGE_TAGS) {
        assert.ok(referenced.has(tag), `navigation must expose stage ${tag}`);
    }
    // VVB stage must NOT be in PP navigation
    assert.ok(!referenced.has('acm0010_stage_vvb'), 'VVB stage must not be in PP navigation');
});

test('the OWNER approval stage is navigable and declared', () => {
    const approval = byTag.get('acm0010_stage_vvb_approval');
    assert.ok(approval, 'the VVB approval stage must exist');
    assert.deepEqual(approval.permissions, ['OWNER']);
    const approvalNav = (policy.policyNavigation || []).find((r) => r.role === 'OWNER');
    assert.ok(approvalNav, 'OWNER navigation must exist');
    assert.ok((approvalNav.steps || []).some((s) => s.block === 'acm0010_stage_vvb_approval'));
});
test('VVB navigation exposes verification steps for monitoring reports', () => {
    const vvb = (policy.policyNavigation || []).find((r) => r.role === 'VVB');
    assert.ok(vvb, 'VVB navigation entry must exist');
    assert.ok(Array.isArray(vvb.steps) && vvb.steps.length > 0,
        'VVB navigation must expose at least one verification step');
    const stepNames = (vvb.steps || []).map((s) => s.name);
    assert.ok(stepNames.some((n) => n.includes('Verify Monitoring Report')),
        'VVB must have a monitor report verification step');
});

// ---------------------------------------------------------------------------
// Reference integrity
// ---------------------------------------------------------------------------

test('every schema referenced by a block exists in the container', () => {
    walkBlocks(policy.config, (n) => {
        for (const key of ['schema', 'outputSchema']) {
            if (typeof n[key] === 'string') {
                assert.ok(SCHEMA_IRIS.includes(n[key]),
                    `block ${n.tag} references missing schema ${n[key]}`);
            }
        }
    });
});

test('the container holds exactly the four implemented schemas', () => {
    assert.equal(SCHEMA_IRIS.length, 8);
    assert.ok(SCHEMA_IRIS.includes('#project-description'));
    assert.ok(SCHEMA_IRIS.includes('#baseline-emission-reduction-calculation'));
    assert.ok(SCHEMA_IRIS.includes('#monitoring-report'));
    assert.ok(SCHEMA_IRIS.includes('#vvb'));
});

// ---------------------------------------------------------------------------
// Calculation wiring and the verified Slice 1-5 outputs
// ---------------------------------------------------------------------------

test('the calculation block reads the project description and emits the calculation schema', () => {
    const calc = byTag.get(CALC_TAG);
    assert.ok(calc, 'calculation block must exist');
    assert.equal(calc.blockType, 'customLogicBlock');
    assert.equal(calc.outputSchema, '#baseline-emission-reduction-calculation');

    const source = (calc.children || []).find((c) => c.blockType === 'documentsSourceAddon');
    assert.ok(source, 'calculation block must declare an input document source');
    assert.equal(source.schema, '#project-description');
});

test('the calculation block is fail-closed', () => {
    // A calculation error must halt the workflow rather than silently emit a
    // partial result. This is what makes the Slice 1-5 validation meaningful.
    assert.equal(byTag.get(CALC_TAG).onErrorAction, 'stop');
});

test('the calculation block is restricted to the Project Proponent', () => {
    assert.deepEqual(byTag.get(CALC_TAG).permissions, ['Project Proponent']);
});

test('the verified Slice 1-5 outputs are exposed by the emitted calculation schema', () => {
    const raw = entries.get('schemas/#baseline-emission-reduction-calculation.json').toString('utf8');
    const schema = JSON.parse(raw);
    const subject = schema.document.$defs['#acm0010-baseline-calculation-subject'];
    const props = Object.keys(subject.properties);

    // Slice 1: staged baseline methane.
    assert.ok(props.includes('stageBreakdown'), 'Slice 1 stageBreakdown must be exposed');
    assert.ok(props.includes('baselineMethaneEmissionsKgCh4'));
    assert.ok(props.includes('baselineMethaneEmissionsTCo2e'));
    // Slice 2: volatile solids derivation.
    assert.ok(props.includes('volatileSolidsDerivation'), 'Slice 2 derivation must be exposed');
    // Slice 3: baseline N2O and the total baseline.
    assert.ok(props.includes('baselineN2O'), 'Slice 3 baselineN2O must be exposed');
    assert.ok(props.includes('baselineEmissionsTCo2e'), 'Slice 3 total baseline must be exposed');
    // Slice 4: aerobic project emissions.
    assert.ok(props.includes('projectEmissionsAerobic'), 'Slice 4 aerobic emissions must be exposed');

    // These remain the only mandatory fields; everything else is opt-in so that
    // documents which do not use a given calculation are unaffected.
    assert.deepEqual(subject.required, [
        'ref', 'year', 'baselineAwms', 'methaneConversionFactor', 'livestockBreakdown',
        'baselineMethaneEmissionsKgCh4', 'globalWarmingPotentialCh4',
        'baselineMethaneEmissionsTCo2e', 'stageBreakdown',
    ]);
});

test('the Slice 5 CH4 density is the single authoritative value', () => {
    const raw = entries.get('schemas/#baseline-emission-reduction-calculation.json').toString('utf8');
    const schema = JSON.parse(raw);
    const subject = schema.document.$defs['#acm0010-baseline-calculation-subject'];
    const aerobic = subject.properties.projectEmissionsAerobic.properties;

    // The aerobic block exposes D_CH4 in t/m3 directly.
    assert.equal(aerobic.ch4DensityTPervm3.type, 'number');
    assert.ok(/t\/m3/.test(aerobic.ch4DensityTPervm3.title), 'density unit must be declared as t/m3');
});

// ---------------------------------------------------------------------------
// Monitoring report wiring
// ---------------------------------------------------------------------------

test('the monitoring report step requests the monitoring report schema', () => {
    const mr = byTag.get(MONITORING_TAG);
    assert.ok(mr, 'monitoring report step must exist');
    assert.equal(mr.blockType, 'requestVcDocumentBlock');
    assert.equal(mr.schema, '#monitoring-report');
    assert.deepEqual(mr.permissions, ['Project Proponent']);
});

test('the monitoring report dataTransformationAddon is attached', () => {
    const transforms = [];
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'dataTransformationAddon') transforms.push(n);
    });
    assert.equal(transforms.length, 2, 'two transformation addons expected (project description + monitoring report)');
    const tags = transforms.map((t) => t.tag);
    assert.ok(tags.includes('project-description'), 'project-description transform present');
    assert.ok(tags.includes('monitoring-report'), 'monitoring-report transform present');
});

test('the VVB verification block references the monitoring report schema', () => {
    const vvb = byTag.get(VVB_VERIFY_TAG);
    assert.ok(vvb, 'VVB verify block must exist');
    // The VVB verify block is an interfaceContainerBlock containing an
    // interfaceDocumentsSourceBlock which holds documentsSourceAddon entries.
    // Walk its children to find a documentsSourceAddon referencing the
    // monitoring-report schema.
    let foundSource = false;
    walkBlocks(vvb, (n) => {
        if (n.blockType === 'documentsSourceAddon' && n.schema === '#monitoring-report') {
            foundSource = true;
        }
    });
    assert.ok(foundSource, 'VVB verify block must declare a documentsSourceAddon for #monitoring-report');
});

// ---------------------------------------------------------------------------
// Constraint guards
// ---------------------------------------------------------------------------

test('the workflow introduces no HTTP or external-call block', () => {
    walkBlocks(policy.config, (n) => {
        assert.ok(n.blockType !== 'httpRequestBlock', 'no HTTP request block may be present');
        assert.ok(n.blockType !== 'integrationButtonBlock', 'no integration block may be present');
        assert.ok(n.blockType !== 'externalDataBlock', 'no external data block may be present');
    });
});

test('the workflow uses only block types that exist in real repository policies', () => {
    const census = repoBlockTypeCensus();
    walkBlocks(policy.config, (n) => {
        if (n.blockType) {
            assert.ok(census.has(n.blockType), `blockType ${n.blockType} is not a real Guardian blockType`);
        }
    });
});

test('roles declared in the policy match the repository reference shape', () => {
    assert.deepEqual(policy.policyRoles.map((r) => r.name).sort(), ['Project Proponent', 'VVB']);
    // Exactly one default role, so a newly created user is usable.
    assert.equal(policy.policyRoles.filter((r) => r.default === true).length, 1);
});

// ---------------------------------------------------------------------------
// Document flow
// ---------------------------------------------------------------------------

test('the Project Description step requests the project description schema', () => {
    const pd = byTag.get(PD_TAG);
    assert.ok(pd, 'project description step must exist');
    assert.equal(pd.blockType, 'requestVcDocumentBlock');
    assert.equal(pd.schema, '#project-description');
    assert.deepEqual(pd.permissions, ['Project Proponent']);
});

test('the Calculation Record step requests the emitted calculation schema', () => {
    const record = byTag.get(RECORD_TAG);
    assert.ok(record, 'calculation record step must exist');
    assert.equal(record.blockType, 'requestVcDocumentBlock');
    assert.equal(record.schema, '#baseline-emission-reduction-calculation');
    assert.deepEqual(record.permissions, ['Project Proponent']);
});

test('no stage is left empty', () => {
    for (const tag of EXPECTED_STAGE_TAGS) {
        const stage = byTag.get(tag);
        assert.ok((stage.children || []).length > 0, `stage ${tag} must contain at least one block`);
    }
});
