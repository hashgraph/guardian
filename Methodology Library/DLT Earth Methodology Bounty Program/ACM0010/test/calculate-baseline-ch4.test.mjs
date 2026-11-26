/**
 * Proof 2: the BE_CH4,y calculation executes and is arithmetically correct.
 *
 * The expression executed here is the one embedded in ACM0010.policy, read back
 * out of the container, so this tests the shipped artifact and not the source
 * file. Expected values are recomputed independently in the test.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

/** Pull the customLogicBlock expression straight out of the built artifact. */
function calcExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.tag === 'acm0010_calculate_baseline_ch4') {
            found = node.expression;
        }
    });
    assert.ok(found, 'customLogicBlock expression must exist in the artifact');
    return found;
}

// ACM0010 parameter DCH4: 0.00067 t/m3 at 20 C and 1 atm. The baseline methane
// equation works in kg CH4, so the same constant is expressed as 0.67 kg/m3.
// Derived from the authoritative t/m3 value so the test can never drift from it.
const D_CH4_T_PER_M3 = 0.00067;
const CH4_DENSITY = D_CH4_T_PER_M3 * 1000;

function projectDescription(overrides = {}) {
    return {
        id: 'acm0010-test-project',
        projectName: 'Slice Test Farm',
        monitoringYear: 2026,
        baselineAwms: { name: 'Anaerobic Lagoon', methaneConversionFactor: 0.1 },
        livestock: [
            { type: 'Dairy Cattle', annualVolatileSolids: 68, maxMethaneProducingCapacity: 0.24 },
            { type: 'Swine', annualVolatileSolids: 53, maxMethaneProducingCapacity: 0.25 },
        ],
        parameters: { globalWarmingPotentialCh4: 28 },
        ...overrides,
    };
}

test('customLogicBlock is wired to the right schemas and role', () => {
    let block = null;
    walkBlocks(policy.config, (n) => { if (n.blockType === 'customLogicBlock') block = n; });
    assert.ok(block, 'policy must contain a customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.outputSchema, '#baseline-emission-reduction-calculation');
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop', 'calculation failures must halt the flow');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('BE_CH4,y matches an independent recomputation', () => {
    const result = runExpression(calcExpression(), { documents: [asDocument(projectDescription())] });

    const expectedDairy = 68 * 0.1 * 0.24 * CH4_DENSITY;
    const expectedSwine = 53 * 0.1 * 0.25 * CH4_DENSITY;
    const expectedKg = expectedDairy + expectedSwine;

    assert.equal(result.ref, 'acm0010-test-project');
    assert.equal(result.year, 2026);
    assert.equal(result.baselineAwms, 'Anaerobic Lagoon');
    assert.equal(result.methaneConversionFactor, 0.1);

    assert.equal(result.livestockBreakdown.length, 2);
    assert.equal(result.livestockBreakdown[0].type, 'Dairy Cattle');
    assert.ok(Math.abs(result.livestockBreakdown[0].baselineMethaneEmissionsKgCh4 - expectedDairy) < 1e-12);
    assert.ok(Math.abs(result.livestockBreakdown[1].baselineMethaneEmissionsKgCh4 - expectedSwine) < 1e-12);

assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - expectedKg) < 1e-12);
    // 68 * 0.1 * 0.24 * 0.67 = 1.09344 ; 53 * 0.1 * 0.25 * 0.67 = 0.88775
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - 1.98119) < 1e-12);
    assert.ok(Math.abs(result.baselineMethaneEmissionsTCo2e - (expectedKg * 28) / 1000) < 1e-12);
});

test('zero MCF yields zero baseline methane (sanity bound)', () => {
    const pd = projectDescription();
    pd.baselineAwms.methaneConversionFactor = 0;
    const result = runExpression(calcExpression(), { documents: [asDocument(pd)] });
    assert.equal(result.baselineMethaneEmissionsKgCh4, 0);
    assert.equal(result.baselineMethaneEmissionsTCo2e, 0);
});

test('single livestock type path works', () => {
    const pd = projectDescription({
        livestock: [{ type: 'Dairy Cattle', annualVolatileSolids: 100, maxMethaneProducingCapacity: 0.3 }],
    });
    const result = runExpression(calcExpression(), { documents: [asDocument(pd)] });
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - 100 * 0.1 * 0.3 * CH4_DENSITY) < 1e-12);
});

test('out-of-range parameters are rejected, not silently accepted', () => {
    const cases = [
        ['negative VS', { livestock: [{ type: 'Swine', annualVolatileSolids: -1, maxMethaneProducingCapacity: 0.25 }] }],
        ['negative B0', { livestock: [{ type: 'Swine', annualVolatileSolids: 10, maxMethaneProducingCapacity: -0.25 }] }],
        ['MCF above 1', { baselineAwms: { name: 'Lagoon', methaneConversionFactor: 1.5 } }],
        ['MCF negative', { baselineAwms: { name: 'Lagoon', methaneConversionFactor: -0.1 } }],
    ];
    for (const [label, override] of cases) {
        assert.throws(
            () => runExpression(calcExpression(), { documents: [asDocument(projectDescription(override))] }),
            /must be/,
            `${label} must be rejected`,
        );
    }
});

test('the calculation output validates against the output schema', () => {
    const result = runExpression(calcExpression(), { documents: [asDocument(projectDescription())] });
    // required fields, mirrored from baseline-emission-reduction-calculation.schema.json
    const required = [
        'ref', 'year', 'baselineAwms', 'methaneConversionFactor', 'livestockBreakdown',
        'baselineMethaneEmissionsKgCh4', 'globalWarmingPotentialCh4', 'baselineMethaneEmissionsTCo2e',
    ];
    for (const key of required) {
        assert.ok(result[key] !== undefined && result[key] !== null, `output missing ${key}`);
    }
    for (const entry of result.livestockBreakdown) {
        for (const key of ['type', 'annualVolatileSolids', 'maxMethaneProducingCapacity', 'baselineMethaneEmissionsKgCh4']) {
            assert.ok(entry[key] !== undefined, `livestock entry missing ${key}`);
        }
        assert.ok(entry.annualVolatileSolids >= 0);
        assert.ok(entry.maxMethaneProducingCapacity >= 0);
    }
    assert.ok(result.year >= 1900 && result.year <= 2200);
    assert.ok(result.globalWarmingPotentialCh4 > 0);
});

// ---------------------------------------------------------------------------
// Staged baseline AWMS chain.
//
// The six tests above use the legacy single-AWMS input shape and must keep
// passing unchanged: they are the backward-compatibility guard for the
// staged-chain generalisation.
// ---------------------------------------------------------------------------

/** Project Description carrying an explicit ordered stage chain. */
function stagedDescription(stages, livestock, overrides = {}) {
    return {
        id: 'acm0010-staged-project',
        projectName: 'Staged Test Farm',
        monitoringYear: 2026,
        baselineAwms: {
            name: stages.length > 0 ? stages[0].name : 'Anaerobic Lagoon',
            methaneConversionFactor: stages.length > 0 ? stages[0].methaneConversionFactor : 0.1,
            stages: stages,
        },
        livestock: livestock,
        parameters: { globalWarmingPotentialCh4: 28 },
        ...overrides,
    };
}

function run(stages, livestock, overrides = {}) {
    const expression = calcExpression();
    return runExpression(expression, {
        documents: [asDocument(stagedDescription(stages, livestock, overrides))],
    });
}

const ONE_TYPE = [{ type: 'Dairy Cattle', annualVolatileSolids: 100, maxMethaneProducingCapacity: 0.24 }];

function ch4(volatileSolids, mcf, b0) {
    return volatileSolids * mcf * b0 * CH4_DENSITY;
}

test('a one-stage chain with eta = 0 equals the legacy single-stage result', () => {
    const stages = [{ name: 'Anaerobic Lagoon', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 }];
    const staged = run(stages, ONE_TYPE);

    // Independent legacy recomputation: no decay, single stage.
    const legacy = ch4(100, 0.1, 0.24);
    assert.ok(Math.abs(staged.baselineMethaneEmissionsKgCh4 - legacy) < 1e-12);
    assert.equal(staged.stageBreakdown.length, 1);
    assert.equal(staged.stageBreakdown[0].volatileSolidsDecayFactor, 1);
    assert.equal(staged.stageBreakdown[0].methaneEmissionsKgCh4, legacy);
});

test('a two-stage chain applies volatile solids decay', () => {
    const stages = [
        { name: 'Anaerobic Lagoon', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5 },
        { name: 'Covered Storage', methaneConversionFactor: 0.02, volatileSolidsReductionFraction: 0 },
    ];
    const result = run(stages, ONE_TYPE);

    const stage0 = ch4(100, 0.1, 0.24);
    const stage1 = ch4(50, 0.02, 0.24); // decay factor 1 * (1 - 0.5)

    assert.equal(result.stageBreakdown.length, 2);
    assert.equal(result.stageBreakdown[0].volatileSolidsDecayFactor, 1);
    assert.equal(result.stageBreakdown[0].volatileSolidsInKg, 100);
    assert.ok(Math.abs(result.stageBreakdown[0].methaneEmissionsKgCh4 - stage0) < 1e-12);

    assert.equal(result.stageBreakdown[1].volatileSolidsDecayFactor, 0.5);
    assert.equal(result.stageBreakdown[1].volatileSolidsInKg, 50);
    assert.ok(Math.abs(result.stageBreakdown[1].methaneEmissionsKgCh4 - stage1) < 1e-12);

    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - (stage0 + stage1)) < 1e-12);
    assert.ok(Math.abs(result.baselineMethaneEmissionsTCo2e - ((stage0 + stage1) * 28) / 1000) < 1e-12);
});

test('a three-stage chain compounds decay across stages', () => {
    const stages = [
        { name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5 },
        { name: 'S2', methaneConversionFactor: 0.05, volatileSolidsReductionFraction: 0.2 },
        { name: 'S3', methaneConversionFactor: 0.01, volatileSolidsReductionFraction: 0 },
    ];
    const result = run(stages, ONE_TYPE);

    const expected = [
        ch4(100, 0.1, 0.24),  // decay 1
        ch4(50, 0.05, 0.24),  // decay 0.5
        ch4(40, 0.01, 0.24),  // decay 0.5 * 0.8
    ];

    assert.equal(result.stageBreakdown.length, 3);
    assert.equal(result.stageBreakdown[2].volatileSolidsDecayFactor, 0.4);
    result.stageBreakdown.forEach((stage, i) => {
        assert.ok(Math.abs(stage.methaneEmissionsKgCh4 - expected[i]) < 1e-12, `stage ${i}`);
    });
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - expected.reduce((a, b) => a + b, 0)) < 1e-12);
});

test('eta = 0 leaves volatile solids undecayed at the next stage', () => {
    const stages = [
        { name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 },
        { name: 'S2', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 },
    ];
    const result = run(stages, ONE_TYPE);
    assert.equal(result.stageBreakdown[1].volatileSolidsDecayFactor, 1);
    assert.equal(result.stageBreakdown[1].volatileSolidsInKg, 100);
});

test('eta = 1 starves every downstream stage of volatile solids', () => {
    const stages = [
        { name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 1 },
        { name: 'S2', methaneConversionFactor: 0.5, volatileSolidsReductionFraction: 0 },
    ];
    const result = run(stages, ONE_TYPE);

    assert.ok(Math.abs(result.stageBreakdown[0].methaneEmissionsKgCh4 - ch4(100, 0.1, 0.24)) < 1e-12);
    assert.equal(result.stageBreakdown[1].volatileSolidsDecayFactor, 0);
    assert.equal(result.stageBreakdown[1].volatileSolidsInKg, 0);
    assert.equal(result.stageBreakdown[1].methaneEmissionsKgCh4, 0);
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - ch4(100, 0.1, 0.24)) < 1e-12);
});

test('MCF = 0 at one stage zeroes only that stage', () => {
    const stages = [
        { name: 'S1', methaneConversionFactor: 0, volatileSolidsReductionFraction: 0.5 },
        { name: 'S2', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 },
    ];
    const result = run(stages, ONE_TYPE);
    assert.equal(result.stageBreakdown[0].methaneEmissionsKgCh4, 0);
    assert.ok(Math.abs(result.stageBreakdown[1].methaneEmissionsKgCh4 - ch4(50, 0.1, 0.24)) < 1e-12);
});

test('multiple livestock types aggregate across every stage', () => {
    const stages = [
        { name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5 },
        { name: 'S2', methaneConversionFactor: 0.02, volatileSolidsReductionFraction: 0 },
    ];
    const livestock = [
        { type: 'Dairy Cattle', annualVolatileSolids: 68, maxMethaneProducingCapacity: 0.24 },
        { type: 'Swine', annualVolatileSolids: 53, maxMethaneProducingCapacity: 0.25 },
    ];
    const result = run(stages, livestock);

    const expected = ch4(68, 0.1, 0.24) + ch4(53, 0.1, 0.25)
        + ch4(34, 0.02, 0.24) + ch4(26.5, 0.02, 0.25);
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - expected) < 1e-12);
});

test('stage and livestock decompositions both sum to the reported total', () => {
    const stages = [
        { name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5 },
        { name: 'S2', methaneConversionFactor: 0.05, volatileSolidsReductionFraction: 0.2 },
        { name: 'S3', methaneConversionFactor: 0.01, volatileSolidsReductionFraction: 0 },
    ];
    const livestock = [
        { type: 'Dairy Cattle', annualVolatileSolids: 68, maxMethaneProducingCapacity: 0.24 },
        { type: 'Swine', annualVolatileSolids: 53, maxMethaneProducingCapacity: 0.25 },
    ];
    const result = run(stages, livestock);

    const stageSum = result.stageBreakdown.reduce((sum, s) => sum + s.methaneEmissionsKgCh4, 0);
    const livestockSum = result.livestockBreakdown.reduce((sum, l) => sum + l.baselineMethaneEmissionsKgCh4, 0);

    assert.ok(Math.abs(stageSum - result.baselineMethaneEmissionsKgCh4) < 1e-12, 'stage sum must equal total');
    assert.ok(Math.abs(livestockSum - result.baselineMethaneEmissionsKgCh4) < 1e-12, 'livestock sum must equal total');
});

test('multi-stage chains report the chain in baselineAwms and the first stage MCF', () => {
    const stages = [
        { name: 'Lagoon', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5 },
        { name: 'Storage', methaneConversionFactor: 0.02, volatileSolidsReductionFraction: 0 },
    ];
    const result = run(stages, ONE_TYPE);
    assert.equal(result.baselineAwms, 'Lagoon -> Storage');
    assert.equal(result.methaneConversionFactor, 0.1);
});

test('expected failures: malformed or out-of-range stage input is rejected', () => {
    const cases = [
        ['empty stages array', [[], ONE_TYPE], /at least one/],
        ['eta negative', [[{ name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: -0.1 }], ONE_TYPE], /must be within/],
        ['eta above 1', [[{ name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 1.5 }], ONE_TYPE], /must be within/],
        ['stage MCF above 1', [[{ name: 'S1', methaneConversionFactor: 2, volatileSolidsReductionFraction: 0 }], ONE_TYPE], /must be within/],
        ['stage MCF negative', [[{ name: 'S1', methaneConversionFactor: -0.2, volatileSolidsReductionFraction: 0 }], ONE_TYPE], /must be within/],
        ['empty livestock', [[{ name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 }], []], /at least one livestock/],
    ];
    for (const [label, [stages, livestock], pattern] of cases) {
        assert.throws(() => run(stages, livestock), pattern, `${label} must be rejected`);
    }
});

test('staged output satisfies the calculation schema required fields', () => {
    const stages = [
        { name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5 },
        { name: 'S2', methaneConversionFactor: 0.02, volatileSolidsReductionFraction: 0 },
    ];
    const result = run(stages, ONE_TYPE);

    for (const key of ['ref', 'year', 'baselineAwms', 'methaneConversionFactor', 'livestockBreakdown',
        'baselineMethaneEmissionsKgCh4', 'globalWarmingPotentialCh4', 'baselineMethaneEmissionsTCo2e',
        'stageBreakdown']) {
        assert.ok(result[key] !== undefined && result[key] !== null, `output missing ${key}`);
    }

    assert.equal(result.stageBreakdown.length, stages.length);
    result.stageBreakdown.forEach((stage, i) => {
        for (const key of ['stage', 'name', 'methaneConversionFactor', 'volatileSolidsReductionFraction',
            'volatileSolidsDecayFactor', 'volatileSolidsInKg', 'methaneEmissionsKgCh4']) {
            assert.ok(stage[key] !== undefined, `stage ${i} missing ${key}`);
        }
        assert.equal(stage.stage, i);
        assert.ok(stage.methaneConversionFactor >= 0 && stage.methaneConversionFactor <= 1);
        assert.ok(stage.volatileSolidsReductionFraction >= 0 && stage.volatileSolidsReductionFraction <= 1);
        assert.ok(stage.volatileSolidsDecayFactor >= 0 && stage.volatileSolidsDecayFactor <= 1);
        assert.ok(stage.volatileSolidsInKg >= 0);
    });
});

// ---------------------------------------------------------------------------
// Slice 2: volatile solids derived from herd parameters.
//
//   VSLT,y  = ( W_site / W_default ) * VS_default * n_d,y
//   N_LT,y  = N_da,y * ( N_p,y / 365 )
//   VS_LT,y = N_LT,y * VSLT,y
//
// These feed the `annualVolatileSolids` input consumed by the BE_CH4,y
// calculation above. The 17 tests above supply annualVolatileSolids directly
// and must keep passing unchanged.
// ---------------------------------------------------------------------------

const HERD = {
    averageWeightSiteKg: 600,
    defaultWeightKg: 500,
    volatileSolidsDefaultKgDmPerDay: 0.2,
    operationalDaysPerYear: 365,
    daysAliveInYear: 365,
    animalsProducedAnnually: 1000,
};

/** Livestock entry with no direct annualVolatileSolids, only herd parameters. */
function herdLivestock(herd = HERD) {
    return { type: 'Dairy Cattle', maxMethaneProducingCapacity: 0.24, herdParameters: herd };
}

function runHerd(herd, stages, overrides = {}) {
    return run(stages, [herdLivestock(herd)], overrides);
}

const ONE_STAGE = [
    { name: 'Anaerobic Lagoon', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 },
];

test('volatile solids are derived from herd parameters (Option 3)', () => {
    const result = runHerd(HERD, ONE_STAGE);

    // (600/500) * 0.20 * 365 = 87.6 kg dm/animal/yr
    const vslt = (600 / 500) * 0.2 * 365;
    // 365 * (1000/365) = 1000 animals
    const n = 365 * (1000 / 365);
    const vs = n * vslt;

    assert.equal(result.volatileSolidsDerivation.length, 1);
    const d = result.volatileSolidsDerivation[0];
    assert.equal(d.source, 'herdParameters');
    assert.equal(d.type, 'Dairy Cattle');
    assert.ok(Math.abs(d.volatileSolidsPerAnimalKgDm - vslt) < 1e-12);
    assert.ok(Math.abs(d.annualAverageAnimals - n) < 1e-12);
    assert.ok(Math.abs(d.annualVolatileSolidsKgDm - vs) < 1e-9);
    assert.ok(Math.abs(d.annualVolatileSolidsKgDm - 87600) < 1e-9);

    // The derived VS must be what BE_CH4,y actually consumed.
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - ch4(vs, 0.1, 0.24)) < 1e-9);
});

test('a directly supplied annualVolatileSolids takes precedence over herd parameters', () => {
    const stages = ONE_STAGE;
    const result = run(stages, [{
        type: 'Dairy Cattle',
        annualVolatileSolids: 100,
        maxMethaneProducingCapacity: 0.24,
        herdParameters: HERD, // present but must be ignored
    }]);

    assert.equal(result.volatileSolidsDerivation[0].source, 'supplied');
    assert.equal(result.volatileSolidsDerivation[0].annualVolatileSolidsKgDm, 100);
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - ch4(100, 0.1, 0.24)) < 1e-12);
});

test('the supplied path still reports a derivation record', () => {
    const result = run(ONE_STAGE, [{ type: 'Swine', annualVolatileSolids: 53, maxMethaneProducingCapacity: 0.25 }]);
    assert.equal(result.volatileSolidsDerivation.length, 1);
    assert.equal(result.volatileSolidsDerivation[0].source, 'supplied');
    assert.equal(result.volatileSolidsDerivation[0].type, 'Swine');
});

test('derived volatile solids compose with the staged chain', () => {
    const stages = [
        { name: 'Lagoon', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5 },
        { name: 'Storage', methaneConversionFactor: 0.02, volatileSolidsReductionFraction: 0 },
    ];
    const vs = 365 * (1000 / 365) * ((600 / 500) * 0.2 * 365);
    const result = runHerd(HERD, stages);

    assert.equal(result.stageBreakdown.length, 2);
    assert.ok(Math.abs(result.stageBreakdown[0].volatileSolidsInKg - vs) < 1e-9);
    assert.ok(Math.abs(result.stageBreakdown[1].volatileSolidsInKg - vs / 2) < 1e-9);
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - (ch4(vs, 0.1, 0.24) + ch4(vs / 2, 0.02, 0.24))) < 1e-9);
});

test('multiple livestock types each derive their own volatile solids', () => {
    const stages = ONE_STAGE;
    const swine = { ...HERD, averageWeightSiteKg: 250, defaultWeightKg: 250, animalsProducedAnnually: 2000 };
    const result = run(stages, [
        { type: 'Dairy Cattle', maxMethaneProducingCapacity: 0.24, herdParameters: HERD },
        { type: 'Swine', maxMethaneProducingCapacity: 0.25, herdParameters: swine },
    ]);

    assert.equal(result.volatileSolidsDerivation.length, 2);
    const dairy = result.volatileSolidsDerivation[0];
    const pig = result.volatileSolidsDerivation[1];
    assert.equal(dairy.type, 'Dairy Cattle');
    assert.equal(pig.type, 'Swine');
    assert.ok(Math.abs(dairy.annualVolatileSolidsKgDm - 87600) < 1e-9);

    const expectedPigVs = 365 * (2000 / 365) * ((250 / 250) * 0.2 * 365);
    assert.ok(Math.abs(pig.annualVolatileSolidsKgDm - expectedPigVs) < 1e-9);
});

test('boundary: zero operational days yields zero volatile solids', () => {
    const result = runHerd({ ...HERD, operationalDaysPerYear: 0 }, ONE_STAGE);
    assert.equal(result.volatileSolidsDerivation[0].volatileSolidsPerAnimalKgDm, 0);
    assert.equal(result.baselineMethaneEmissionsKgCh4, 0);
});

test('boundary: zero days alive yields zero annual average animals', () => {
    const result = runHerd({ ...HERD, daysAliveInYear: 0 }, ONE_STAGE);
    assert.equal(result.volatileSolidsDerivation[0].annualAverageAnimals, 0);
    assert.equal(result.baselineMethaneEmissionsKgCh4, 0);
});

test('boundary: site weight equal to default weight applies no scaling', () => {
    const result = runHerd({ ...HERD, averageWeightSiteKg: 500 }, ONE_STAGE);
    assert.ok(Math.abs(result.volatileSolidsDerivation[0].volatileSolidsPerAnimalKgDm - (0.2 * 365)) < 1e-12);
});

test('boundary: partial year scales both the per-animal and average-animal terms', () => {
    const herd = { ...HERD, operationalDaysPerYear: 100, daysAliveInYear: 200, animalsProducedAnnually: 500 };
    const result = runHerd(herd, ONE_STAGE);

    const vslt = (600 / 500) * 0.2 * 100;
    const n = 200 * (500 / 365);
    assert.ok(Math.abs(result.volatileSolidsDerivation[0].volatileSolidsPerAnimalKgDm - vslt) < 1e-12);
    assert.ok(Math.abs(result.volatileSolidsDerivation[0].annualAverageAnimals - n) < 1e-12);
    assert.ok(Math.abs(result.volatileSolidsDerivation[0].annualVolatileSolidsKgDm - vslt * n) < 1e-9);
});

test('expected failures: malformed herd parameters are rejected', () => {
    const bad = {
        'site weight zero': { averageWeightSiteKg: 0 },
        'site weight negative': { averageWeightSiteKg: -600 },
        'default weight zero': { defaultWeightKg: 0 },
        'default VS rate negative': { volatileSolidsDefaultKgDmPerDay: -0.2 },
        'operational days above 365': { operationalDaysPerYear: 366 },
        'operational days negative': { operationalDaysPerYear: -1 },
        'days alive above 365': { daysAliveInYear: 400 },
        'days alive negative': { daysAliveInYear: -5 },
        'animals produced negative': { animalsProducedAnnually: -10 },
    };
    for (const [label, override] of Object.entries(bad)) {
        assert.throws(() => runHerd({ ...HERD, ...override }, ONE_STAGE), /must be/, `${label} must be rejected`);
    }
});

test('expected failures: neither volatile solids nor herd parameters is rejected', () => {
    assert.throws(
        () => run(ONE_STAGE, [{ type: 'Dairy Cattle', maxMethaneProducingCapacity: 0.24 }]),
        /must be supplied, or herdParameters/,
    );
});

test('expected failures: a directly supplied negative volatile solids is rejected', () => {
    assert.throws(
        () => run(ONE_STAGE, [{ type: 'Dairy Cattle', annualVolatileSolids: -1, maxMethaneProducingCapacity: 0.24 }]),
        /annualVolatileSolids must be >= 0/,
    );
});

test('derived volatile solids appear in the stage breakdown consistently', () => {
    const vs = 87600;
    const result = runHerd(HERD, ONE_STAGE);
    assert.ok(Math.abs(result.stageBreakdown[0].volatileSolidsInKg - vs) < 1e-9);
    assert.ok(Math.abs(result.livestockBreakdown[0].annualVolatileSolids - vs) < 1e-9);
    assert.ok(Math.abs(result.stageBreakdown[0].methaneEmissionsKgCh4
        - result.livestockBreakdown[0].baselineMethaneEmissionsKgCh4) < 1e-9);
});

// ---------------------------------------------------------------------------
// Slice 3: baseline N2O emissions (ACM0010 equations 6, 7 and 8).
//
//   E_N2O,D,y  = SUM_j [ EF_N2O,D,j * MS%_Bl,j ] * N_EX_LT,y * N_LT,y
//   E_N2O,ID,y = SUM_j [ EF_N2O,ID * MS%_Bl,j * F_gas,m ] * N_EX_LT,y * N_LT,y
//   BE_N2O,y   = ( E_N2O,D,y + E_N2O,ID,y ) * (44/28) * GWP_N2O / 1000
//
// Gated OFF unless parameters.globalWarmingPotentialN2O is supplied, so all 30
// tests above must keep passing unchanged.
// ---------------------------------------------------------------------------

const N2O_PARAMS = {
    globalWarmingPotentialCh4: 28,
    globalWarmingPotentialN2O: 265,
    indirectN2OEmissionFactorKgN2ONPerKgN: 0.01,
    fractionNitrogenVolatilised: 0.3,
};

const N2O_STAGE = {
    name: 'Anaerobic Lagoon',
    methaneConversionFactor: 0.1,
    volatileSolidsReductionFraction: 0,
    manureFraction: 1,
    directN2OEmissionFactorKgN2ONPerKgN: 0.001,
};

function n2oLivestock(nitrogenExcretion = 100, herd = HERD) {
    return {
        type: 'Dairy Cattle',
        maxMethaneProducingCapacity: 0.24,
        herdParameters: herd,
        nitrogenExcretionKgNPerAnimalYear: nitrogenExcretion,
    };
}

function runN2O(livestock, stages = [N2O_STAGE], parameters = {}) {
    const subject = stagedDescription(stages, livestock);
    subject.parameters = { ...subject.parameters, ...N2O_PARAMS, ...parameters };
    return runExpression(calcExpression(), { documents: [asDocument(subject)] });
}

test('baseline N2O is absent unless a GWP for N2O is supplied', () => {
    const result = runHerd(HERD, ONE_STAGE);
    assert.equal(result.baselineN2O, undefined);
    assert.equal(result.baselineEmissionsTCo2e, undefined);
});

test('direct and indirect baseline N2O follow equations 7 and 8', () => {
    const result = runN2O([n2oLivestock()]);

    // N_LT = 1000; N_EX = 100 kg N/head/yr => 100,000 kg N
    const expectedDirect = 100000 * 0.001;
    const expectedIndirect = 100000 * 0.01 * 0.3;

    assert.ok(Math.abs(result.baselineN2O.directN2OEmissionsKgN2ON - expectedDirect) < 1e-9);
    assert.ok(Math.abs(result.baselineN2O.indirectN2OEmissionsKgN2ON - expectedIndirect) < 1e-9);
    assert.ok(Math.abs(result.baselineN2O.totalN2OEmissionsKgN2ON - 400) < 1e-9);
});

test('BE_N2O,y applies the 44/28 conversion and GWP', () => {
    const result = runN2O([n2oLivestock()]);
    const expected = (400 * (44 / 28) * 265) / 1000;

    assert.equal(result.baselineN2O.n2oNToN2OConversionFactor, 44 / 28);
    assert.equal(result.baselineN2O.globalWarmingPotentialN2O, 265);
    assert.ok(Math.abs(result.baselineN2O.baselineN2OEmissionsTCo2e - expected) < 1e-9);
    assert.ok(Math.abs(result.baselineN2O.baselineN2OEmissionsTCo2e - 166.57142857142858) < 1e-9);
});

test('total baseline emissions combine methane and N2O', () => {
    const result = runN2O([n2oLivestock()]);
    const ch4Tco2e = ch4(87600, 0.1, 0.24) * 28 / 1000;

    assert.ok(Math.abs(result.baselineEmissionsTCo2e
        - (result.baselineMethaneEmissionsTCo2e + result.baselineN2O.baselineN2OEmissionsTCo2e)) < 1e-9);
    assert.ok(Math.abs(result.baselineEmissionsTCo2e - (ch4Tco2e + 166.57142857142858)) < 1e-9);
});

test('manure fractions split across multiple baseline systems', () => {
    const stages = [
        { ...N2O_STAGE, name: 'Lagoon', manureFraction: 0.6, directN2OEmissionFactorKgN2ONPerKgN: 0.001 },
        { ...N2O_STAGE, name: 'Solid Storage', manureFraction: 0.4, directN2OEmissionFactorKgN2ONPerKgN: 0.02 },
    ];
    const result = runN2O([n2oLivestock()], stages);

    // direct   = 100,000 * (0.001*0.6 + 0.02*0.4) = 100,000 * 0.0086 = 860
    // indirect = 100,000 * 0.01 * 0.3 * (0.6 + 0.4) = 300
    assert.ok(Math.abs(result.baselineN2O.directEmissionFactorSum - 0.0086) < 1e-12);
    assert.ok(Math.abs(result.baselineN2O.directN2OEmissionsKgN2ON - 860) < 1e-9);
    assert.ok(Math.abs(result.baselineN2O.indirectN2OEmissionsKgN2ON - 300) < 1e-9);
});

test('several livestock types each contribute nitrogen excretion', () => {
    const swineHerd = { ...HERD, averageWeightSiteKg: 250, defaultWeightKg: 250, animalsProducedAnnually: 2000 };
    const livestock = [
        n2oLivestock(100),
        { type: 'Swine', maxMethaneProducingCapacity: 0.25, herdParameters: swineHerd, nitrogenExcretionKgNPerAnimalYear: 70 },
    ];
    const result = runN2O(livestock);

    // Dairy: 1000 head * 100 kg N = 100,000; Swine: 2000 head * 70 = 140,000
    const expectedDirect = (100000 + 140000) * 0.001;
    const expectedIndirect = (100000 + 140000) * 0.01 * 0.3;
    assert.ok(Math.abs(result.baselineN2O.directN2OEmissionsKgN2ON - expectedDirect) < 1e-9);
    assert.ok(Math.abs(result.baselineN2O.indirectN2OEmissionsKgN2ON - expectedIndirect) < 1e-9);
});

test('N2O and CH4 are computed from the same herd and stage inputs', () => {
    const stages = [
        { ...N2O_STAGE, volatileSolidsReductionFraction: 0.5 },
        { ...N2O_STAGE, name: 'Storage', manureFraction: 0, volatileSolidsReductionFraction: 0 },
    ];
    const result = runN2O([n2oLivestock()], stages);

    // manureFraction 1 + 0 = 1, so N2O is unaffected by the second stage
    assert.ok(Math.abs(result.baselineN2O.directN2OEmissionsKgN2ON - 100) < 1e-9);
    // methane does decay across the chain
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - (ch4(87600, 0.1, 0.24) + ch4(43800, 0.1, 0.24))) < 1e-9);
});

test('boundary: zero manure fraction yields zero N2O', () => {
    const result = runN2O([n2oLivestock()], [{ ...N2O_STAGE, manureFraction: 0 }]);
    assert.equal(result.baselineN2O.directN2OEmissionsKgN2ON, 0);
    assert.equal(result.baselineN2O.indirectN2OEmissionsKgN2ON, 0);
    assert.equal(result.baselineN2O.baselineN2OEmissionsTCo2e, 0);
});

test('boundary: zero direct emission factor yields zero direct N2O only', () => {
    const result = runN2O([n2oLivestock()], [{ ...N2O_STAGE, directN2OEmissionFactorKgN2ONPerKgN: 0 }]);
    assert.equal(result.baselineN2O.directN2OEmissionsKgN2ON, 0);
    assert.ok(Math.abs(result.baselineN2O.indirectN2OEmissionsKgN2ON - 300) < 1e-9);
});

test('boundary: zero volatilisation yields zero indirect N2O only', () => {
    const result = runN2O([n2oLivestock()], [N2O_STAGE], { fractionNitrogenVolatilised: 0 });
    assert.equal(result.baselineN2O.indirectN2OEmissionsKgN2ON, 0);
    assert.ok(Math.abs(result.baselineN2O.directN2OEmissionsKgN2ON - 100) < 1e-9);
});

test('boundary: zero nitrogen excretion yields zero N2O', () => {
    const result = runN2O([n2oLivestock(0)]);
    assert.equal(result.baselineN2O.totalN2OEmissionsKgN2ON, 0);
});

test('expected failures: out-of-range N2O inputs are rejected', () => {
    const cases = [
        ['manure fraction above 1', [n2oLivestock()], [{ ...N2O_STAGE, manureFraction: 1.5 }], {}, /manureFraction must be within/],
        ['manure fraction negative', [n2oLivestock()], [{ ...N2O_STAGE, manureFraction: -0.1 }], {}, /manureFraction must be within/],
        ['direct EF negative', [n2oLivestock()], [{ ...N2O_STAGE, directN2OEmissionFactorKgN2ONPerKgN: -0.001 }], {}, /directN2OEmissionFactorKgN2ONPerKgN must be >= 0/],
        ['nitrogen excretion negative', [n2oLivestock(-5)], [N2O_STAGE], {}, /nitrogenExcretionKgNPerAnimalYear must be >= 0/],
        ['GWP N2O zero', [n2oLivestock()], [N2O_STAGE], { globalWarmingPotentialN2O: 0 }, /globalWarmingPotentialN2O must be > 0/],
        ['GWP N2O negative', [n2oLivestock()], [N2O_STAGE], { globalWarmingPotentialN2O: -265 }, /globalWarmingPotentialN2O must be > 0/],
        ['indirect EF negative', [n2oLivestock()], [N2O_STAGE], { indirectN2OEmissionFactorKgN2ONPerKgN: -0.01 }, /indirectN2OEmissionFactorKgN2ONPerKgN must be >= 0/],
        ['volatilisation above 1', [n2oLivestock()], [N2O_STAGE], { fractionNitrogenVolatilised: 1.2 }, /fractionNitrogenVolatilised must be within/],
    ];
    for (const [label, livestock, stages, params, pattern] of cases) {
        assert.throws(() => runN2O(livestock, stages, params), pattern, `${label} must be rejected`);
    }
});

test('expected failures: enabling N2O without a stage manure fraction is rejected', () => {
    assert.throws(
        () => runN2O([n2oLivestock()], [{ name: 'Lagoon', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 }]),
        /manureFraction must be within/,
    );
});

test('expected failures: enabling N2O without nitrogen excretion is rejected', () => {
    assert.throws(
        () => runN2O([{ type: 'Dairy Cattle', maxMethaneProducingCapacity: 0.24, herdParameters: HERD }]),
        /nitrogenExcretionKgNPerAnimalYear must be >= 0/,
    );
});

test('expected failures: N2O needs the animal count, so a supplied volatile solids value is rejected', () => {
    assert.throws(
        () => runN2O([{ type: 'Dairy Cattle', annualVolatileSolids: 100, maxMethaneProducingCapacity: 0.24, nitrogenExcretionKgNPerAnimalYear: 100 }]),
        /derive annualVolatileSolids from herdParameters/,
    );
});

test('baseline N2O output satisfies its schema required fields', () => {
    const result = runN2O([n2oLivestock()]);
    for (const key of ['directEmissionFactorSum', 'indirectEmissionFactorSum', 'directN2OEmissionsKgN2ON',
        'indirectN2OEmissionsKgN2ON', 'totalN2OEmissionsKgN2ON', 'n2oNToN2OConversionFactor',
        'globalWarmingPotentialN2O', 'baselineN2OEmissionsTCo2e']) {
        assert.ok(result.baselineN2O[key] !== undefined, `baselineN2O missing ${key}`);
    }
    assert.ok(Math.abs(result.baselineN2O.n2oNToN2OConversionFactor - 44 / 28) < 1e-12);
    assert.ok(result.baselineN2O.directN2OEmissionsKgN2ON >= 0);
    assert.ok(result.baselineN2O.indirectN2OEmissionsKgN2ON >= 0);
    assert.ok(Math.abs(result.baselineN2O.directN2OEmissionsKgN2ON
        + result.baselineN2O.indirectN2OEmissionsKgN2ON
        - result.baselineN2O.totalN2OEmissionsKgN2ON) < 1e-9);
});

// ---------------------------------------------------------------------------
// Slice 4: project-side CH4 emissions from aerobic AWMS treatment, PE_Aer,y
// (ACM0010 section "(ii) Methane emissions from aerobic AWMS treatment",
// equation 11.2 / equation 12).
//
//   PE_Aer,y = GWP_CH4 * 0.001 * SUM_i [ VS(i,j_aer) * F_Aer * B0_i * D_CH4 ]
//
// "Methane generating potential" carries NO MCF. Gated OFF unless a stage sets
// aerobicTreatment: true, so all 43 tests above must keep passing unchanged.
// ---------------------------------------------------------------------------

const D_CH4 = 0.00067; // t/m3, the value ACM0010 states for D_CH4
const AEROBIC_FRACTION = 0.001;

function aerobicStage(overrides = {}) {
    return {
        name: 'Aerobic Lagoon',
        methaneConversionFactor: 0.1,
        volatileSolidsReductionFraction: 0,
        aerobicTreatment: true,
        volatileSolidsDirectedToAerobicFraction: 1,
        ...overrides,
    };
}

function runAerobic(stages, livestock = [herdLivestock()]) {
    return run(stages, livestock);
}

test('PE_Aer,y is absent unless a stage is flagged aerobicTreatment', () => {
    const result = runAerobic([ONE_STAGE[0]]);
    assert.equal(result.projectEmissionsAerobic, undefined);
});

test('aerobic emissions are 0.1% of the methane generating potential', () => {
    const result = runAerobic([aerobicStage()]);

    // VS directed = 87,600 kg; potential = 87,600 * 0.24 m3/kg * 0.00067 t/m3
    const potential = 87600 * 0.24 * D_CH4;
    const expected = potential * AEROBIC_FRACTION * 28;

    assert.ok(Math.abs(result.projectEmissionsAerobic.methaneGeneratingPotentialTCh4 - potential) < 1e-12);
    assert.equal(result.projectEmissionsAerobic.aerobicMethaneFraction, AEROBIC_FRACTION);
    assert.equal(result.projectEmissionsAerobic.ch4DensityTPervm3, D_CH4);
    assert.ok(Math.abs(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e - expected) < 1e-12);
    assert.ok(Math.abs(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e - 0.39441024) < 1e-9);
});

test('generating potential carries no methane conversion factor', () => {
    // Identical B0 and VS but a very different MCF must not change PE_Aer,y,
    // because potential is independent of MCF. Baseline CH4 does change.
    const low = runAerobic([aerobicStage({ methaneConversionFactor: 0.01 })]);
    const high = runAerobic([aerobicStage({ methaneConversionFactor: 0.8 })]);

    assert.equal(low.projectEmissionsAerobic.methaneGeneratingPotentialTCh4,
        high.projectEmissionsAerobic.methaneGeneratingPotentialTCh4);
    assert.equal(low.projectEmissionsAerobic.projectEmissionsAerobicTCo2e,
        high.projectEmissionsAerobic.projectEmissionsAerobicTCo2e);
    assert.notEqual(low.baselineMethaneEmissionsKgCh4, high.baselineMethaneEmissionsKgCh4);
});

test('volatile solids reaching the aerobic stage are reduced by prior stages', () => {
    const stages = [
        { name: 'Anaerobic Digester', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.8 },
        aerobicStage({ name: 'Aerobic Lagoon' }),
    ];
    const result = runAerobic(stages);

    // decay factor at stage 1 is (1 - 0.8) = 0.2 => 17,520 kg VS
    const expectedVs = 87600 * 0.2;
    assert.ok(Math.abs(result.projectEmissionsAerobic.volatileSolidsToAerobicKg - expectedVs) < 1e-9);
    assert.ok(Math.abs(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e
        - (expectedVs * 0.24 * D_CH4) * AEROBIC_FRACTION * 28) < 1e-12);
});

test('F_Aer scales the volatile solids directed to the aerobic system', () => {
    const result = runAerobic([aerobicStage({ volatileSolidsDirectedToAerobicFraction: 0.4 })]);
    assert.ok(Math.abs(result.projectEmissionsAerobic.volatileSolidsToAerobicKg - 87600 * 0.4) < 1e-9);
    assert.ok(Math.abs(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e
        - 0.39441024 * 0.4) < 1e-12);
});

test('aerobic stage is identified by index and name', () => {
    const stages = [
        { name: 'Storage', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 },
        aerobicStage({ name: 'Aerobic Lagoon' }),
    ];
    const result = runAerobic(stages);
    assert.equal(result.projectEmissionsAerobic.aerobicStage, 1);
    assert.equal(result.projectEmissionsAerobic.aerobicStageName, 'Aerobic Lagoon');
});

test('multiple livestock types each contribute to generating potential', () => {
    const swineHerd = { ...HERD, averageWeightSiteKg: 250, defaultWeightKg: 250, animalsProducedAnnually: 2000 };
    const livestock = [
        herdLivestock(HERD),
        { type: 'Swine', maxMethaneProducingCapacity: 0.25, herdParameters: swineHerd },
    ];
    const result = runAerobic([aerobicStage()], livestock);

    const vsSwine = 2000 * ((250 / 250) * 0.2 * 365);
    const expected = ((87600 * 0.24) + (vsSwine * 0.25)) * D_CH4;
    assert.ok(Math.abs(result.projectEmissionsAerobic.methaneGeneratingPotentialTCh4 - expected) < 1e-9);
});

test('boundary: F_Aer of zero yields no aerobic emissions', () => {
    const result = runAerobic([aerobicStage({ volatileSolidsDirectedToAerobicFraction: 0 })]);
    assert.equal(result.projectEmissionsAerobic.volatileSolidsToAerobicKg, 0);
    assert.equal(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e, 0);
});

test('boundary: a fully decayed prior chain starves the aerobic stage', () => {
    const stages = [
        { name: 'Digester', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 1 },
        aerobicStage(),
    ];
    const result = runAerobic(stages);
    assert.equal(result.projectEmissionsAerobic.volatileSolidsToAerobicKg, 0);
    assert.equal(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e, 0);
});

test('boundary: PE_Aer,y and BE_CH4,y share one CH4 density (0.001 / MCF identity)', () => {
    // Both equations use the same D_CH4, so for any MCF and F_Aer = 1:
    //   PE_Aer,y = VS * B0 * D_CH4 * 0.001 * GWP      [t CO2e]
    //   BE_CH4,y = VS * MCF * B0 * D_CH4 * GWP / 1000  [t CO2e]
    // giving PE_Aer,y / BE_CH4,y = 0.001 / MCF exactly.
    // Under the pre-Slice-5 densities (0.00067 t/m3 vs 0.716 kg/m3) this ratio
    // was 0.00936 instead of 0.01, so this test fails if the densities diverge.
    const mcf = 0.1;
    const result = runAerobic([aerobicStage({ methaneConversionFactor: mcf })]);

    const ratio = result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e
        / result.baselineMethaneEmissionsTCo2e;

    assert.ok(Math.abs(ratio - 0.001 / mcf) < 1e-12,
        `expected ratio ${0.001 / mcf}, got ${ratio}`);
    // Sanity: aerobic emissions are small relative to baseline methane.
    assert.ok(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e
        < result.baselineMethaneEmissionsTCo2e);
});

test('expected failures: more than one aerobic stage is rejected', () => {
    assert.throws(
        () => runAerobic([aerobicStage({ name: 'A' }), aerobicStage({ name: 'B' })]),
        /exactly one baseline stage may be flagged as aerobicTreatment/,
    );
});

test('expected failures: an aerobic stage without F_Aer is rejected', () => {
    assert.throws(
        () => runAerobic([{ name: 'Lagoon', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0, aerobicTreatment: true }]),
        /volatileSolidsDirectedToAerobicFraction must be within \[0, 1\]/,
    );
});

test('expected failures: out-of-range F_Aer is rejected', () => {
    for (const bad of [1.5, -0.2]) {
        assert.throws(
            () => runAerobic([aerobicStage({ volatileSolidsDirectedToAerobicFraction: bad })]),
            /volatileSolidsDirectedToAerobicFraction must be within \[0, 1\]/,
        );
    }
});

test('the superseded 0.716 kg/m3 density is no longer used anywhere', () => {
    // Slice 5 reconciled the two densities. ACM0010 states D_CH4 = 0.00067 t/m3
    // (0.67 kg/m3). The earlier 0.716 kg/m3 (0 C) value must not reappear.
    assert.equal(D_CH4 * 1000, 0.67);
    assert.notEqual(D_CH4 * 1000, 0.716);

    const result = runAerobic([aerobicStage()]);
    assert.equal(result.projectEmissionsAerobic.ch4DensityTPervm3, 0.00067);
});

test('PE_Aer,y output satisfies its schema required fields', () => {
    const result = runAerobic([aerobicStage()]);
    for (const key of ['aerobicStage', 'aerobicStageName', 'volatileSolidsDirectedToAerobicFraction',
        'volatileSolidsToAerobicKg', 'ch4DensityTPervm3', 'aerobicMethaneFraction',
        'methaneGeneratingPotentialTCh4', 'globalWarmingPotentialCh4', 'projectEmissionsAerobicTCo2e']) {
        assert.ok(result.projectEmissionsAerobic[key] !== undefined, `projectEmissionsAerobic missing ${key}`);
    }
    assert.ok(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e >= 0);
    assert.equal(result.projectEmissionsAerobic.globalWarmingPotentialCh4, 28);
});

// ---------------------------------------------------------------------------
// Slice 5: CH4 density reconciliation.
//
// ACM0010 parameter DCH4 = 0.00067 t/m3 at 20 C and 1 atm (v02 MP24, v03 EB35,
// v08-draft MP59). Before this slice the policy carried two different densities:
// 0.716 kg/m3 in BE_CH4,y and 0.00067 t/m3 in PE_Aer,y. Both now derive from the
// single authoritative value.
// ---------------------------------------------------------------------------

test('the authoritative CH4 density is 0.00067 t/m3 as ACM0010 states', () => {
    assert.equal(D_CH4_T_PER_M3, 0.00067);
    assert.equal(CH4_DENSITY, 0.67);
    // The two are the same physical constant, not two values.
    assert.equal(CH4_DENSITY, D_CH4_T_PER_M3 * 1000);
    // The pre-Slice-5 value must not reappear anywhere.
    assert.notEqual(CH4_DENSITY, 0.716);
});

test('BE_CH4,y uses the reconciled density, evidenced from first principles', () => {
    const stages = [{ name: 'Lagoon', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0 }];
    const result = run(stages, [{ type: 'Dairy Cattle', annualVolatileSolids: 100, maxMethaneProducingCapacity: 0.24 }]);

    // 100 kg VS * 0.24 m3 CH4/kg VS = 24 m3 CH4 potential
    // 24 m3 * 0.00067 t/m3 = 0.01608 t CH4 = 16.08 kg CH4
    const cubicMetres = 100 * 0.24;
    const tonnesCh4 = cubicMetres * D_CH4_T_PER_M3;
    const expectedKg = tonnesCh4 * 1000;
    const expectedEmissionsKg = expectedKg * 0.1; // apply MCF

    assert.ok(Math.abs(cubicMetres - 24) < 1e-12);
    assert.ok(Math.abs(expectedKg - 16.08) < 1e-12);
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - expectedEmissionsKg) < 1e-12);
    assert.ok(Math.abs(result.baselineMethaneEmissionsKgCh4 - 1.608) < 1e-12);
});

test('PE_Aer,y and BE_CH4,y report the same density', () => {
    const result = runAerobic([aerobicStage()]);
    // PE_Aer,y exposes D_CH4 directly in t/m3.
    assert.equal(result.projectEmissionsAerobic.ch4DensityTPervm3, D_CH4_T_PER_M3);
    // And the baseline path is arithmetically consistent with it, proven above
    // by the 0.001 / MCF identity.
});

test('density units are handled consistently across the CO2e conversion', () => {
    // BE_CH4,y is computed in kg CH4 then converted with /1000; PE_Aer,y is
    // computed directly in t CH4. Both must land in t CO2e on the same scale.
    const result = runAerobic([aerobicStage()]);

    const ch4Tco2e = result.baselineMethaneEmissionsTCo2e;
    const aerTco2e = result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e;
    const potentialT = result.projectEmissionsAerobic.methaneGeneratingPotentialTCh4;

    // Potential in tonnes; 0.1% of it, times GWP.
    assert.ok(Math.abs(aerTco2e - potentialT * 0.001 * 28) < 1e-12);
    // Baseline methane in kg converted to tonnes CO2e.
    assert.ok(Math.abs(ch4Tco2e - result.baselineMethaneEmissionsKgCh4 * 28 / 1000) < 1e-12);
    // Both are order-of-magnitude t CO2e, not mixed units.
    assert.ok(ch4Tco2e > 1 && ch4Tco2e < 1000);
    assert.ok(aerTco2e > 0 && aerTco2e < 1);
});

test('an ambiguous or wrong density cannot pass the identity check', () => {
    // Simulate the pre-Slice-5 defect: if BE_CH4,y used 0.716 kg/m3 while
    // PE_Aer,y used 0.00067 t/m3, the ratio would be 0.00067*1000/0.716*0.001/0.1.
    const defectiveRatio = (0.00067 * 1000 / 0.716) * (0.001 / 0.1);
    assert.ok(Math.abs(defectiveRatio - 0.01) > 1e-6, 'defective ratio must differ from 0.01');

    // The shipped implementation must reproduce the correct ratio exactly.
    const result = runAerobic([aerobicStage({ methaneConversionFactor: 0.1 })]);
    const actual = result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e
        / result.baselineMethaneEmissionsTCo2e;
    assert.ok(Math.abs(actual - 0.01) < 1e-12);
    assert.ok(Math.abs(actual - defectiveRatio) > 1e-6);
});

test('reconciliation does not disturb the N2O or total-baseline results', () => {
    // N2O carries no CH4 density, so Slice 3 values must be unchanged.
    const result = runN2O([n2oLivestock()]);
    assert.ok(Math.abs(result.baselineN2O.baselineN2OEmissionsTCo2e - 166.57142857142858) < 1e-9);
    assert.ok(Math.abs(result.baselineEmissionsTCo2e
        - (result.baselineMethaneEmissionsTCo2e + 166.57142857142858)) < 1e-9);
});

test('reconciliation does not disturb the PE_Aer,y result', () => {
    const result = runAerobic([aerobicStage()]);
    assert.ok(Math.abs(result.projectEmissionsAerobic.projectEmissionsAerobicTCo2e - 0.39441024) < 1e-9);
    assert.ok(Math.abs(result.projectEmissionsAerobic.methaneGeneratingPotentialTCh4 - 14.08608) < 1e-9);
});

// ---------------------------------------------------------------------------
// Slice 6: relative nitrogen reduction (RN) stage tracking.
//
//   nitrogenFactor(j) = PRODUCT over k < j of ( 1 - RN(k) )
//
// Stage factors only. This slice performs NO project N2O arithmetic; PE_N2O,y is
// deliberately not implemented. RN is a physically distinct quantity from the
// volatile solids reduction eta and is never derived from it.
// ---------------------------------------------------------------------------

function rnStage(name, rn, overrides = {}) {
    return {
        name,
        methaneConversionFactor: 0.1,
        volatileSolidsReductionFraction: 0,
        ...(rn === undefined ? {} : { relativeNitrogenReduction: rn }),
        ...overrides,
    };
}

test('missing optional RN input produces no nitrogen ledger at all', () => {
    const result = run([rnStage('S1'), rnStage('S2')], ONE_TYPE);
    assert.equal(result.nitrogenStageBreakdown, undefined);
    // and no stage entry carries nitrogen fields
    for (const stage of result.stageBreakdown) {
        assert.equal(stage.relativeNitrogenReduction, undefined);
        assert.equal(stage.nitrogenDecayFactor, undefined);
    }
});

test('single-stage RN yields a cumulative factor of exactly 1', () => {
    const result = run([rnStage('S1', 0.4)], ONE_TYPE);
    assert.equal(result.nitrogenStageBreakdown.length, 1);
    assert.equal(result.nitrogenStageBreakdown[0].relativeNitrogenReduction, 0.4);
    assert.equal(result.nitrogenStageBreakdown[0].nitrogenDecayFactor, 1);
});

test('multiple successive stages compound the nitrogen factor', () => {
    const result = run([rnStage('S1', 0.5), rnStage('S2', 0.2), rnStage('S3', 0.1)], ONE_TYPE);
    assert.equal(result.nitrogenStageBreakdown.length, 3);
    // stage 0 factor 1; stage 1 = 1*(1-0.5); stage 2 = 0.5*(1-0.2)
    assert.equal(result.nitrogenStageBreakdown[0].nitrogenDecayFactor, 1);
    assert.ok(Math.abs(result.nitrogenStageBreakdown[1].nitrogenDecayFactor - 0.5) < 1e-12);
    assert.ok(Math.abs(result.nitrogenStageBreakdown[2].nitrogenDecayFactor - 0.4) < 1e-12);
});

test('RN = 0 leaves the nitrogen factor undecayed at the next stage', () => {
    const result = run([rnStage('S1', 0), rnStage('S2', 0)], ONE_TYPE);
    assert.equal(result.nitrogenStageBreakdown[1].nitrogenDecayFactor, 1);
});

test('RN = 1 starves every downstream stage of nitrogen', () => {
    const result = run([rnStage('S1', 1), rnStage('S2', 0.5)], ONE_TYPE);
    assert.equal(result.nitrogenStageBreakdown[1].nitrogenDecayFactor, 0);
});

test('fractional reductions compose multiplicatively', () => {
    const result = run([rnStage('S1', 0.25), rnStage('S2', 0.5), rnStage('S3', 0.1)], ONE_TYPE);
    // stage 0 = 1; stage 1 = 1*(1-0.25) = 0.75; stage 2 = 0.75*(1-0.5) = 0.375
    assert.ok(Math.abs(result.nitrogenStageBreakdown[0].nitrogenDecayFactor - 1) < 1e-12);
    assert.ok(Math.abs(result.nitrogenStageBreakdown[1].nitrogenDecayFactor - 0.75) < 1e-12);
    assert.ok(Math.abs(result.nitrogenStageBreakdown[2].nitrogenDecayFactor - 0.375) < 1e-12);
});

test('RN supplied on only some stages omits the others from the ledger', () => {
    const result = run([rnStage('S1'), rnStage('S2', 0.5)], ONE_TYPE);
    assert.equal(result.nitrogenStageBreakdown.length, 1);
    assert.equal(result.nitrogenStageBreakdown[0].stage, 1);
    // stage 1 still inherits factor 1 because stage 0 applied no reduction
    assert.equal(result.nitrogenStageBreakdown[0].nitrogenDecayFactor, 1);
});

test('expected failures: RN outside [0, 1] is rejected', () => {
    for (const bad of [-0.1, 1.5, 2]) {
        assert.throws(
            () => run([rnStage('S1', bad)], ONE_TYPE),
            /relativeNitrogenReduction must be within \[0, 1\]/,
        );
    }
});

test('expected failures: non-finite RN is rejected', () => {
    assert.throws(
        () => run([rnStage('S1', NaN)], ONE_TYPE),
        /relativeNitrogenReduction must be a finite number/,
    );
    assert.throws(
        () => run([rnStage('S1', Infinity)], ONE_TYPE),
        /relativeNitrogenReduction must be a finite number/,
    );
});

test('RN is never derived from the volatile solids reduction fraction', () => {
    // eta = 0.9 but no RN supplied: nitrogen must be untouched
    const stages = [{
        name: 'Digester',
        methaneConversionFactor: 0.1,
        volatileSolidsReductionFraction: 0.9,
    }, rnStage('S2')];
    const result = run(stages, ONE_TYPE);
    assert.equal(result.nitrogenStageBreakdown, undefined);

    // eta = 0 but RN = 0.8: nitrogen decays even though volatile solids do not.
    // A middle stage that supplies no RN is omitted from the ledger, but the
    // preceding reduction must still carry forward to the next supplied stage.
    const stages2 = [
        rnStage('S1', 0.8, { volatileSolidsReductionFraction: 0 }),
        rnStage('S2'),
        rnStage('S3', 0),
    ];
    const result2 = run(stages2, ONE_TYPE);
    assert.equal(result2.nitrogenStageBreakdown.length, 2);
    assert.equal(result2.nitrogenStageBreakdown[0].stage, 0);
    assert.equal(result2.nitrogenStageBreakdown[0].nitrogenDecayFactor, 1);
    // stage 2: 1 * (1 - 0.8) carried through the unsupplied stage 1
    assert.ok(Math.abs(result2.nitrogenStageBreakdown[1].nitrogenDecayFactor - 0.2) < 1e-12);
    // volatile solids are untouched throughout, because every eta is 0
    assert.equal(result2.stageBreakdown[2].volatileSolidsDecayFactor, 1);
});

test('RN tracking leaves the methane calculation completely unchanged', () => {
    const withoutRn = [
        { name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5 },
        { name: 'S2', methaneConversionFactor: 0.02, volatileSolidsReductionFraction: 0 },
    ];
    const withRn = [
        { name: 'S1', methaneConversionFactor: 0.1, volatileSolidsReductionFraction: 0.5, relativeNitrogenReduction: 0.3 },
        { name: 'S2', methaneConversionFactor: 0.02, volatileSolidsReductionFraction: 0, relativeNitrogenReduction: 0.7 },
    ];
    const a = run(withoutRn, ONE_TYPE);
    const b = run(withRn, ONE_TYPE);

    assert.equal(a.baselineMethaneEmissionsKgCh4, b.baselineMethaneEmissionsKgCh4);
    assert.equal(a.baselineMethaneEmissionsTCo2e, b.baselineMethaneEmissionsTCo2e);
    // Cross-realm arrays from the vm sandbox, so compare structurally.
    assert.equal(
        JSON.stringify(a.stageBreakdown.map((s) => s.methaneEmissionsKgCh4)),
        JSON.stringify(b.stageBreakdown.map((s) => s.methaneEmissionsKgCh4)),
    );
    assert.equal(
        JSON.stringify(a.stageBreakdown.map((s) => s.volatileSolidsDecayFactor)),
        JSON.stringify(b.stageBreakdown.map((s) => s.volatileSolidsDecayFactor)),
    );
    assert.equal(a.baselineN2O, undefined);
    assert.equal(b.baselineN2O, undefined);
});

test('RN tracking leaves baseline N2O completely unchanged', () => {
    const result = runN2O([n2oLivestock()], [{ ...N2O_STAGE, relativeNitrogenReduction: 0.5 }]);
    assert.ok(Math.abs(result.baselineN2O.directN2OEmissionsKgN2ON - 100) < 1e-9);
    assert.ok(Math.abs(result.baselineN2O.totalN2OEmissionsKgN2ON - 400) < 1e-9);
    assert.ok(Math.abs(result.baselineN2O.baselineN2OEmissionsTCo2e - 166.57142857142858) < 1e-9);
    assert.ok(Math.abs(result.baselineEmissionsTCo2e
        - (result.baselineMethaneEmissionsTCo2e + 166.57142857142858)) < 1e-9);
});

test('RN tracking performs no project N2O arithmetic', () => {
    const result = run([rnStage('S1', 0.5), rnStage('S2', 0.5)], ONE_TYPE);
    assert.equal(result.projectN2O, undefined);
    assert.equal(result.projectEmissionsTCo2e, undefined);
    // nitrogen output is stage factors only, never a mass or a CO2e figure
    for (const entry of result.nitrogenStageBreakdown) {
        assert.deepEqual(
            Object.keys(entry).sort(),
            ['name', 'nitrogenDecayFactor', 'relativeNitrogenReduction', 'stage'],
        );
    }
});


// ---------------------------------------------------------------------------
// Slice 7: project N2O emissions, PE_N2O,y Option 1 (ACM0010 v9.0 section 5.4.3).
//
//   PE_N2O,y  = GWP_N2O * (44/28) / 1000 * ( EN2O,D,y + EN2O,ID,y )
//   EN2O,D,y  = SUM_LT SUM_j EF_N2O,D,j  * N_EX_LT,y * N_LT * MS%_j * Pi_{k<j}(1-RN_k)
//   EN2O,ID,y = SUM_LT SUM_j EF_N2O,ID,j * F_gas,m  * N_EX_LT,y * N_LT * MS%_j * Pi_{k<j}(1-RN_k)
//
// Gated on parameters.projectN2OOption, so all 90 tests above are unaffected.
// ---------------------------------------------------------------------------

// A real stage carries BOTH the baseline factors (MS%_Bl,j, EF_N2O,D,j) and the
// project factors (MS%_j, EF_N2O,D,j, EF_N2O,ID,j). Enabling GWP_N2O activates the
// baseline N2O calculation as well, so the baseline fields must be present too.
const PROJECT_N2O_STAGE = {
    ...N2O_STAGE,
    name: 'Project Lagoon',
    projectManureFraction: 1,
    projectDirectN2OEmissionFactorKgN2ONPerKgN: 0.001,
    projectIndirectN2OEmissionFactorKgN2ONPerKgN: 0.01,
};

const PROJECT_N2O_PARAMS = {
    globalWarmingPotentialCh4: 28,
    globalWarmingPotentialN2O: 265,
    indirectN2OEmissionFactorKgN2ONPerKgN: 0.01,
    fractionNitrogenVolatilised: 0.3,
    projectN2OOption: 'option1',
};

function runProjectN2O(livestock, stages = [PROJECT_N2O_STAGE], parameters = {}) {
    const subject = stagedDescription(stages, livestock);
    subject.parameters = { ...subject.parameters, ...PROJECT_N2O_PARAMS, ...parameters };
    return runExpression(calcExpression(), { documents: [asDocument(subject)] });
}

test('PE_N2O,y is absent unless projectN2OOption is declared', () => {
    const result = runN2O([n2oLivestock()]);
    assert.equal(result.projectN2O, undefined);
});

test('option 1 direct N2O follows the methodology form', () => {
    const result = runProjectN2O([n2oLivestock()]);
    // N_LT = 1000; N_EX = 100 kg N/head/yr => 100,000 kg N; MS%_j = 1; RN none
    const expected = 100000 * 0.001;
    assert.ok(Math.abs(result.projectN2O.directN2OEmissionsKgN2ON - expected) < 1e-9);
});

test('option 1 indirect N2O applies EF_N2O,ID,j and F_gas,m', () => {
    const result = runProjectN2O([n2oLivestock()]);
    const expected = 100000 * 0.01 * 0.3;
    assert.ok(Math.abs(result.projectN2O.indirectN2OEmissionsKgN2ON - expected) < 1e-9);
    assert.equal(result.projectN2O.fractionNitrogenVolatilised, 0.3);
});

test('PE_N2O,y applies the 44/28 conversion and GWP', () => {
    const result = runProjectN2O([n2oLivestock()]);
    const expected = (400 * (44 / 28) * 265) / 1000;
    assert.ok(Math.abs(result.projectN2O.projectN2OEmissionsTCo2e - expected) < 1e-9);
    assert.equal(result.projectN2O.option, 'option1');
    assert.equal(result.projectN2O.n2oNToN2OConversionFactor, 44 / 28);
});

test('option 1 stage nitrogen is reduced by the cumulative RN product', () => {
    const stages = [
        { ...PROJECT_N2O_STAGE, relativeNitrogenReduction: 0.5 },
        { ...PROJECT_N2O_STAGE, name: 'Storage', relativeNitrogenReduction: 0 },
    ];
    const result = runProjectN2O([n2oLivestock()], stages);
    const s = result.projectN2O.stageBreakdown;
    assert.equal(s.length, 2);
    assert.equal(s[0].nitrogenDecayFactor, 1);
    assert.ok(Math.abs(s[0].manureFractionNitrogenExcretion - 100000) < 1e-6);
    // stage 1 sees 100000 * (1 - 0.5) = 50,000
    assert.ok(Math.abs(s[1].nitrogenDecayFactor - 0.5) < 1e-12);
    assert.ok(Math.abs(s[1].manureFractionNitrogenExcretion - 50000) < 1e-6);
    assert.ok(Math.abs(result.projectN2O.directN2OEmissionsKgN2ON - (100 + 50)) < 1e-6);
});

test('RN = 1 removes nitrogen from every later project stage', () => {
    const stages = [
        { ...PROJECT_N2O_STAGE, relativeNitrogenReduction: 1 },
        { ...PROJECT_N2O_STAGE, name: 'Storage', relativeNitrogenReduction: 0 },
    ];
    const result = runProjectN2O([n2oLivestock()], stages);
    assert.equal(result.projectN2O.stageBreakdown[1].nitrogenDecayFactor, 0);
    assert.ok(Math.abs(result.projectN2O.stageBreakdown[1].directN2OEmissionsKgN2ON) < 1e-12);
});

test('project manure fraction splits nitrogen across project systems', () => {
    const stages = [
        { ...PROJECT_N2O_STAGE, projectManureFraction: 0.6 },
        { ...PROJECT_N2O_STAGE, name: 'Storage', projectManureFraction: 0.4 },
    ];
    const result = runProjectN2O([n2oLivestock()], stages);
    const s = result.projectN2O.stageBreakdown;
    assert.ok(Math.abs(s[0].manureFractionNitrogenExcretion - 60000) < 1e-6);
    assert.ok(Math.abs(s[1].manureFractionNitrogenExcretion - 40000) < 1e-6);
    assert.ok(Math.abs(result.projectN2O.directN2OEmissionsKgN2ON - 100) < 1e-6);
});

test('project N2O stage breakdown sums to the reported total', () => {
    const stages = [
        { ...PROJECT_N2O_STAGE, relativeNitrogenReduction: 0.4 },
        { ...PROJECT_N2O_STAGE, name: 'S2', relativeNitrogenReduction: 0.2 },
    ];
    const result = runProjectN2O([n2oLivestock()], stages);
    const direct = result.projectN2O.stageBreakdown.reduce((a, x) => a + x.directN2OEmissionsKgN2ON, 0);
    const indirect = result.projectN2O.stageBreakdown.reduce((a, x) => a + x.indirectN2OEmissionsKgN2ON, 0);
    assert.ok(Math.abs(direct - result.projectN2O.directN2OEmissionsKgN2ON) < 1e-9);
    assert.ok(Math.abs(indirect - result.projectN2O.indirectN2OEmissionsKgN2ON) < 1e-9);
    assert.ok(Math.abs(direct + indirect - result.projectN2O.totalN2OEmissionsKgN2ON) < 1e-9);
});

test('several livestock types each contribute project nitrogen', () => {
    const swineHerd = { ...HERD, averageWeightSiteKg: 250, defaultWeightKg: 250, animalsProducedAnnually: 2000 };
    const livestock = [
        n2oLivestock(100),
        { type: 'Swine', maxMethaneProducingCapacity: 0.25, herdParameters: swineHerd, nitrogenExcretionKgNPerAnimalYear: 70 },
    ];
    const result = runProjectN2O(livestock);
    assert.ok(Math.abs(result.projectN2O.directN2OEmissionsKgN2ON - 240) < 1e-6);
});

test('a cleaner project system yields lower N2O than the baseline', () => {
    // Baseline: N2O_STAGE, EF_N2O,D = 0.001 on 100,000 kg N => 100 kg N2O-N/yr.
    const baseline = runN2O([n2oLivestock()]);

    // Same herd and same manure fraction, but the project system's direct EF is
    // an order of magnitude lower => 10 kg N2O-N/yr.
    const cleaner = runProjectN2O([n2oLivestock()],
        [{ ...PROJECT_N2O_STAGE, projectDirectN2OEmissionFactorKgN2ONPerKgN: 0.0001 }]);

    assert.ok(Math.abs(baseline.baselineN2O.directN2OEmissionsKgN2ON - 100) < 1e-9);
    assert.ok(Math.abs(cleaner.projectN2O.directN2OEmissionsKgN2ON - 10) < 1e-9);
    assert.ok(cleaner.projectN2O.directN2OEmissionsKgN2ON
        < baseline.baselineN2O.directN2OEmissionsKgN2ON);
    assert.ok(cleaner.projectN2O.projectN2OEmissionsTCo2e
        < baseline.baselineN2O.baselineN2OEmissionsTCo2e);
});

test('boundary: zero project manure fraction yields zero project N2O', () => {
    const result = runProjectN2O([n2oLivestock()], [{ ...PROJECT_N2O_STAGE, projectManureFraction: 0 }]);
    assert.equal(result.projectN2O.directN2OEmissionsKgN2ON, 0);
    assert.equal(result.projectN2O.projectN2OEmissionsTCo2e, 0);
});

test('option 2 is dispatched, not rejected', () => {
    // Option 2 is implemented in Slice 8; this guards the dispatcher so the
    // option cannot silently fall back to option 1 arithmetic.
    const result = runProjectN2O([n2oLivestock()], [option2Stage()], {
        projectN2OOption: 'option2',
        projectIndirectN2OEmissionFactorKgN2ONPerKgN: 0.01,
    });
    assert.equal(result.projectN2O.option, 'option2');
});

test('expected failures: an unknown option is rejected', () => {
    assert.throws(
        () => runProjectN2O([n2oLivestock()], [PROJECT_N2O_STAGE], { projectN2OOption: 'option3' }),
        /must be "option1" or "option2"/,
    );
});

test('expected failures: missing project inputs are rejected', () => {
    assert.throws(
        () => runProjectN2O([n2oLivestock()], [{ ...PROJECT_N2O_STAGE, projectManureFraction: undefined }]),
        /projectManureFraction must be within/,
    );
    assert.throws(
        () => runProjectN2O([n2oLivestock()], [{ ...PROJECT_N2O_STAGE, projectDirectN2OEmissionFactorKgN2ONPerKgN: undefined }]),
        /projectDirectN2OEmissionFactorKgN2ONPerKgN must be >= 0/,
    );
    assert.throws(
        () => runProjectN2O([n2oLivestock()], [{ ...PROJECT_N2O_STAGE, projectIndirectN2OEmissionFactorKgN2ONPerKgN: undefined }]),
        /projectIndirectN2OEmissionFactorKgN2ONPerKgN must be >= 0/,
    );
});

test('expected failures: project N2O without GWP for N2O is rejected', () => {
    assert.throws(
        () => runProjectN2O([n2oLivestock()], [PROJECT_N2O_STAGE], { globalWarmingPotentialN2O: undefined }),
        /requires parameters.globalWarmingPotentialN2O/,
    );
});

test('expected failures: out-of-range project factors are rejected', () => {
    const cases = [
        [{ projectManureFraction: 1.5 }, /projectManureFraction must be within/],
        [{ projectManureFraction: -0.1 }, /projectManureFraction must be within/],
        [{ projectDirectN2OEmissionFactorKgN2ONPerKgN: -0.001 }, /projectDirectN2OEmissionFactorKgN2ONPerKgN must be >= 0/],
        [{ projectIndirectN2OEmissionFactorKgN2ONPerKgN: -0.01 }, /projectIndirectN2OEmissionFactorKgN2ONPerKgN must be >= 0/],
    ];
    for (const [over, pattern] of cases) {
        assert.throws(() => runProjectN2O([n2oLivestock()], [{ ...PROJECT_N2O_STAGE, ...over }]), pattern);
    }
});

test('expected failures: project N2O needs the animal count', () => {
    assert.throws(
        () => runProjectN2O([{ type: 'Dairy Cattle', annualVolatileSolids: 100, maxMethaneProducingCapacity: 0.24, nitrogenExcretionKgNPerAnimalYear: 100 }]),
        /derive annualVolatileSolids from herdParameters/,
    );
});

test('PE_N2O,y does not alter BE_CH4,y or BE_N2O,y', () => {
    const base = runN2O([n2oLivestock()]);
    const withProject = runProjectN2O([n2oLivestock()]);
    assert.equal(base.baselineMethaneEmissionsKgCh4, withProject.baselineMethaneEmissionsKgCh4);
    assert.ok(Math.abs(base.baselineN2O.directN2OEmissionsKgN2ON
        - withProject.baselineN2O.directN2OEmissionsKgN2ON) < 1e-9);
    assert.ok(Math.abs(base.baselineEmissionsTCo2e - withProject.baselineEmissionsTCo2e) < 1e-9);
});

// ---------------------------------------------------------------------------
// Slice 8: project N2O emissions, PE_N2O,y Option 2 (ACM0010 v9.0 section
// 5.4.3.2, equations 19 and 20) - the methodology's preferred option.
//
//   EN_N2O,D,y  = SUM_j EF_N2O,D,j * SUM_{m=1..12} ( V_m,j * [TN]_m,j )
//   EN_N2O,ID,y = EF_N2O * SUM_{j,m} V_m,j * [TN]_m,j * f_N2O
//
// Measurement based: no manure fraction, no animal count, no nitrogen
// reduction chain.
// ---------------------------------------------------------------------------

const TWELVE = 12;
const MONTHLY_VOLUME = new Array(TWELVE).fill(100);   // 100 m3/month
const MONTHLY_TN = new Array(TWELVE).fill(0.5);       // 0.5 kg N/m3 => 50 kg N/month

const OPTION2_PARAMS = {
    globalWarmingPotentialCh4: 28,
    globalWarmingPotentialN2O: 265,
    indirectN2OEmissionFactorKgN2ONPerKgN: 0.01,
    fractionNitrogenVolatilised: 0.3,
    projectN2OOption: 'option2',
    projectIndirectN2OEmissionFactorKgN2ONPerKgN: 0.01,
};

function option2Stage(overrides = {}) {
    return {
        ...PROJECT_N2O_STAGE,
        projectEffluentMonthlyVolumeM3: [...MONTHLY_VOLUME],
        projectEffluentNitrogenConcentrationKgNPerM3: [...MONTHLY_TN],
        ...overrides,
    };
}

function runOption2(stages = [option2Stage()], parameters = {}, livestock = [n2oLivestock()]) {
    const subject = stagedDescription(stages, livestock);
    subject.parameters = { ...subject.parameters, ...OPTION2_PARAMS, ...parameters };
    return runExpression(calcExpression(), { documents: [asDocument(subject)] });
}

test('option 2 sums twelve months of volume times concentration', () => {
    const result = runOption2();
    // 100 m3/month * 0.5 kg N/m3 = 50 kg N/month * 12 months = 600 kg N/yr
    assert.ok(Math.abs(result.projectN2O.totalEffluentNitrogenKg - 600) < 1e-9);
    assert.equal(result.projectN2O.option, 'option2');
});

test('option 2 direct N2O applies EF_N2O,D,j to measured nitrogen', () => {
    const result = runOption2();
    assert.ok(Math.abs(result.projectN2O.directN2OEmissionsKgN2ON - 600 * 0.001) < 1e-9);
});

test('option 2 indirect N2O applies a single EF_N2O and f_N2O to summed nitrogen', () => {
    const result = runOption2();
    assert.ok(Math.abs(result.projectN2O.indirectN2OEmissionsKgN2ON - 600 * 0.01 * 0.3) < 1e-9);
    assert.equal(result.projectN2O.projectIndirectN2OEmissionFactorKgN2ONPerKgN, 0.01);
});

test('option 2 applies the 44/28 conversion and GWP', () => {
    const result = runOption2();
    const expected = ((0.6 + 1.8) * (44 / 28) * 265) / 1000;
    assert.ok(Math.abs(result.projectN2O.projectN2OEmissionsTCo2e - expected) < 1e-9);
});

test('option 2 is measurement based and ignores modelled nitrogen excretion', () => {
    // Baseline N2O genuinely depends on N_EX_LT,y, so proving Option 2 ignores it
    // requires showing the parameter is live in the baseline path and inert in
    // the project path.
    const a = runOption2([option2Stage()], {}, [n2oLivestock(100)]);
    const b = runOption2([option2Stage()], {}, [n2oLivestock(9999)]);

    assert.ok(Math.abs(a.baselineN2O.directN2OEmissionsKgN2ON
        - b.baselineN2O.directN2OEmissionsKgN2ON) > 1,
    'baseline N2O must react to N_EX_LT,y, otherwise this test proves nothing');
    assert.ok(Math.abs(a.projectN2O.directN2OEmissionsKgN2ON
        - b.projectN2O.directN2OEmissionsKgN2ON) < 1e-12);
    assert.ok(Math.abs(a.projectN2O.totalEffluentNitrogenKg
        - b.projectN2O.totalEffluentNitrogenKg) < 1e-12);
});

test('option 2 is unaffected by manure fractions and the RN chain', () => {
    const plain = runOption2();
    const noisy = runOption2([option2Stage({
        projectManureFraction: 0.3,
        relativeNitrogenReduction: 0.8,
    })]);
    assert.ok(Math.abs(plain.projectN2O.directN2OEmissionsKgN2ON
        - noisy.projectN2O.directN2OEmissionsKgN2ON) < 1e-9);
    assert.ok(Math.abs(plain.projectN2O.totalEffluentNitrogenKg
        - noisy.projectN2O.totalEffluentNitrogenKg) < 1e-9);
});

test('option 2 sums nitrogen across multiple project systems', () => {
    const result = runOption2([option2Stage(), option2Stage({ name: 'Storage' })]);
    assert.equal(result.projectN2O.stageBreakdown.length, 2);
    assert.ok(Math.abs(result.projectN2O.totalEffluentNitrogenKg - 1200) < 1e-9);
    assert.ok(Math.abs(result.projectN2O.directN2OEmissionsKgN2ON - 1.2) < 1e-9);
});

test('option 2 stage nitrogen sums to the reported total', () => {
    const result = runOption2([option2Stage(), option2Stage({ name: 'S2' })]);
    const sum = result.projectN2O.stageBreakdown.reduce((a, x) => a + x.effluentNitrogenKg, 0);
    assert.ok(Math.abs(sum - result.projectN2O.totalEffluentNitrogenKg) < 1e-9);
});

test('option 2 cross-validates against option 1 on equivalent nitrogen mass', () => {
    // 600 kg N/yr reaching a single project system at MS%_j = 1
    const viaOption1 = runProjectN2O([{
        type: 'Dairy Cattle',
        maxMethaneProducingCapacity: 0.24,
        herdParameters: HERD,
        nitrogenExcretionKgNPerAnimalYear: 600 / 1000,
    }], [{
        ...PROJECT_N2O_STAGE,
        projectDirectN2OEmissionFactorKgN2ONPerKgN: 0.001,
        projectIndirectN2OEmissionFactorKgN2ONPerKgN: 0.01,
    }]);
    const viaOption2 = runOption2();

    assert.ok(Math.abs(viaOption1.projectN2O.directN2OEmissionsKgN2ON
        - viaOption2.projectN2O.directN2OEmissionsKgN2ON) < 1e-6);
    assert.ok(Math.abs(viaOption1.projectN2O.indirectN2OEmissionsKgN2ON
        - viaOption2.projectN2O.indirectN2OEmissionsKgN2ON) < 1e-6);
    assert.ok(Math.abs(viaOption1.projectN2O.projectN2OEmissionsTCo2e
        - viaOption2.projectN2O.projectN2OEmissionsTCo2e) < 1e-6);
});

test('boundary: zero volume or concentration yields zero project N2O', () => {
    const noVolume = runOption2([option2Stage({ projectEffluentMonthlyVolumeM3: new Array(TWELVE).fill(0) })]);
    assert.equal(noVolume.projectN2O.directN2OEmissionsKgN2ON, 0);
    const noN = runOption2([option2Stage({ projectEffluentNitrogenConcentrationKgNPerM3: new Array(TWELVE).fill(0) })]);
    assert.equal(noN.projectN2O.directN2OEmissionsKgN2ON, 0);
});

test('boundary: partial year of non-zero months is counted correctly', () => {
    const volumes = new Array(TWELVE).fill(0);
    volumes[0] = 100; volumes[1] = 100;   // two months only
    const result = runOption2([option2Stage({ projectEffluentMonthlyVolumeM3: volumes })]);
    // 2 * 100 m3 * 0.5 kg N/m3 = 100 kg N
    assert.ok(Math.abs(result.projectN2O.totalEffluentNitrogenKg - 100) < 1e-9);
});

test('expected failures: monthly series must hold exactly twelve values', () => {
    assert.throws(
        () => runOption2([option2Stage({ projectEffluentMonthlyVolumeM3: [1, 2, 3] })]),
        /projectEffluentMonthlyVolumeM3 must hold exactly 12/,
    );
    assert.throws(
        () => runOption2([option2Stage({ projectEffluentNitrogenConcentrationKgNPerM3: new Array(11).fill(1) })]),
        /projectEffluentNitrogenConcentrationKgNPerM3 must hold exactly 12/,
    );
    assert.throws(
        () => runOption2([option2Stage({ projectEffluentMonthlyVolumeM3: undefined })]),
        /projectEffluentMonthlyVolumeM3 must hold exactly 12/,
    );
});

test('expected failures: negative monthly measurements are rejected', () => {
    const bad = new Array(TWELVE).fill(100);
    bad[3] = -1;
    assert.throws(
        () => runOption2([option2Stage({ projectEffluentMonthlyVolumeM3: bad })]),
        /projectEffluentMonthlyVolumeM3 must be a finite number >= 0/,
    );
});

test('expected failures: option 2 missing shared inputs is rejected', () => {
    assert.throws(
        () => runOption2([option2Stage()], { projectIndirectN2OEmissionFactorKgN2ONPerKgN: undefined }),
        /projectIndirectN2OEmissionFactorKgN2ONPerKgN must be >= 0/,
    );
    assert.throws(
        () => runOption2([option2Stage()], { globalWarmingPotentialN2O: undefined }),
        /requires parameters.globalWarmingPotentialN2O/,
    );
    assert.throws(
        () => runOption2([option2Stage()], { fractionNitrogenVolatilised: 1.4 }),
        /fractionNitrogenVolatilised must be within/,
    );
    assert.throws(
        () => runOption2([option2Stage({ projectDirectN2OEmissionFactorKgN2ONPerKgN: undefined })]),
        /projectDirectN2OEmissionFactorKgN2ONPerKgN must be >= 0/,
    );
});

test('option 2 does not alter BE_CH4,y or BE_N2O,y', () => {
    const baseline = runN2O([n2oLivestock()]);
    const withOption2 = runOption2();
    assert.equal(baseline.baselineMethaneEmissionsKgCh4, withOption2.baselineMethaneEmissionsKgCh4);
    assert.ok(Math.abs(baseline.baselineN2O.directN2OEmissionsKgN2ON
        - withOption2.baselineN2O.directN2OEmissionsKgN2ON) < 1e-9);
});
