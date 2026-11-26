import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, runExpression, asDocument, walkBlocks } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

function calcExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.tag === 'acm0010_calculate_baseline_ch4') {
            found = node.expression;
        }
    });
    assert.ok(found, 'acm0010_calculate_baseline_ch4 customLogicBlock must exist');
    return found;
}

function baseProject(overrides = {}) {
    return {
        id: 'acm0010-er-test',
        projectName: 'ER Test Farm',
        monitoringYear: 2026,
        baselineAwms: {
            name: 'Anaerobic Lagoon',
            methaneConversionFactor: 0.1,
            stages: [{
                name: 'Anaerobic Lagoon',
                methaneConversionFactor: 0.1,
                volatileSolidsReductionFraction: 0,
            }],
        },
        livestock: [
            {
                type: 'Dairy Cattle',
                annualVolatileSolids: 87600,
                maxMethaneProducingCapacity: 0.24,
            },
        ],
        parameters: {
            globalWarmingPotentialCh4: 28,
        },
        ...overrides,
    };
}

test('baseline CH4 emissions are computed and total baseline equals CH4 when N2O is not enabled', () => {
    const result = runExpression(calcExpression(), { documents: [asDocument(baseProject())] });
    assert.ok(result.baselineMethaneEmissionsKgCh4 > 0);
    assert.ok(Math.abs(result.baselineMethaneEmissionsTCo2e - (result.baselineMethaneEmissionsKgCh4 * 28 / 1000)) < 1e-9);
    assert.equal(result.baselineN2O, undefined);
    assert.equal(result.baselineEmissionsTCo2e, undefined);
});

test('project emissions, leakage and ER fields are absent when no project/leakage options are declared', () => {
    const result = runExpression(calcExpression(), { documents: [asDocument(baseProject())] });
    assert.equal(result.projectN2O, undefined);
    assert.equal(result.projectEmissionsAerobic, undefined);
    assert.equal(result.projectEmissionsTCo2e, undefined);
    assert.equal(result.leakageTCo2e, undefined);
    assert.equal(result.emissionReductionsTCo2e, undefined);
});
