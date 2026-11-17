/**
 * Proof 2: the C_FUEL calculation executes and is arithmetically correct.
 *
 * The expression executed here is read back out of the built VM0010.policy, so
 * this tests the shipped artifact rather than the source file. Expected values
 * are recomputed independently in the test.
 *
 * Appendix 2, Equation 48:  EF = EF_IPCC * HV * rho / 1000
 * Section 8.1.4, Eq 12 as corrected 4 Sept 2026 (Correction 3):
 *     C_FUEL = sum(E_*),   in tCO2e, with the 44/12 denominator removed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

function calcExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock'
            && node.outputSchema === '#baseline-fossil-fuel-emissions') {
            found = node.expression;
        }
    });
    assert.ok(found, 'the C_FUEL customLogicBlock expression must exist in the artifact');
    return found;
}

function projectDescription(overrides = {}) {
    return {
        id: 'vm0010-test-project',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [
            // felling / snigging
            { fuelType: 'Diesel', source: 'E_HARVEST', ipccEmissionFactor: 74100, heatingValue: 0.043, density: 840, consumptionKl: 120 },
            // log hauling
            { fuelType: 'Diesel', source: 'E_HAULING', ipccEmissionFactor: 74100, heatingValue: 0.043, density: 840, consumptionKl: 80 },
            // log transport
            { fuelType: 'Diesel', source: 'E_TRANSPORT', ipccEmissionFactor: 74100, heatingValue: 0.043, density: 840, consumptionKl: 200 },
            // sawmill electricity
            { fuelType: 'Grid electricity', source: 'E_PROCESSING', ipccEmissionFactor: 1000, heatingValue: 0.001, density: 1000, consumptionKl: 50 },
        ],
        ...overrides,
    };
}

function expectedEmissionFactor(input) {
    return (input.ipccEmissionFactor * input.heatingValue * input.density) / 1000;
}

test('customLogicBlock is wired to the right schemas and role', () => {
    let block = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock'
            && n.outputSchema === '#baseline-fossil-fuel-emissions') block = n;
    });
    assert.ok(block, 'policy must contain a customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.outputSchema, '#baseline-fossil-fuel-emissions');
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop', 'calculation failures must halt the flow');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('Appendix 2 Eq 48 emission factors match an independent recomputation', () => {
    const pd = projectDescription();
    const result = runExpression(calcExpression(), { documents: [asDocument(pd)] });

    // EF_FUEL = EF_IPCC * HV * rho / 1000, then * consumption
    const expectedEHarvest = expectedEmissionFactor(pd.fuelInputs[0]) * pd.fuelInputs[0].consumptionKl;
    assert.ok(
        Math.abs(result.emissionSources.E_HARVEST - expectedEHarvest) < 1e-9,
        `E_HARVEST ${result.emissionSources.E_HARVEST} vs ${expectedEHarvest}`,
    );

    const sumOfFour = ['E_HARVEST', 'E_HAULING', 'E_TRANSPORT', 'E_PROCESSING']
        .reduce((acc, k) => acc + result.emissionSources[k], 0);
    assert.ok(Math.abs(result.sumEmissionsTco2e - sumOfFour) < 1e-9, 'sum equals the four sources');
});

test('C_FUEL equals the plain sum, with no divisor (C&C Correction 3)', () => {
    const pd = projectDescription();
    const result = runExpression(calcExpression(), { documents: [asDocument(pd)] });

    assert.equal('carbonToCo2eFactor' in result, false, 'the removed divisor must not be emitted');
    assert.ok(
        Math.abs(result.cFuelTco2e - result.sumEmissionsTco2e) < 1e-12,
        'C_FUEL = sum of the four terms, no division applied',
    );

    // Independent hand-computation.
    // Diesel: EF_IPCC 74100 kg/TJ * HV 0.043 TJ/kg * rho 840 kg/kL / 1000
    //        = 2676.492 tCO2e/kL.  Diesel consumption = 120 + 80 + 200 = 400 kL
    //        => 1070596.8 tCO2e
    // Electricity: 1000 * 0.001 * 1000 / 1000 = 1 tCO2e/kL * 50 kL = 50 tCO2e
    // Total = 1070646.8 tCO2e, which is C_FUEL as corrected (tCO2e)
    const dieselFactor = (74100 * 0.043 * 840) / 1000;
    assert.ok(Math.abs(dieselFactor - 2676.492) < 1e-9, `diesel factor ${dieselFactor}`);
    const expectedSum = dieselFactor * 400 + 50;
    assert.ok(
        Math.abs(result.sumEmissionsTco2e - expectedSum) < 1e-6,
        `sum ${result.sumEmissionsTco2e} vs ${expectedSum}`,
    );
    assert.ok(
        Math.abs(result.cFuelTco2e - 1070646.8) < 1e-6,
        `C_FUEL ${result.cFuelTco2e} must be the undiminished sum`,
    );
});

test('the superseded 44/12 divisor and the earlier 88/56 misreading are both absent', () => {
    const result = runExpression(calcExpression(), { documents: [asDocument(projectDescription())] });

    // Base v1.4 Eq 12 was C_FUEL = sum / (44/12), expressed in tC.
    const baseForm = result.sumEmissionsTco2e / (44 / 12);
    assert.ok(
        Math.abs(result.cFuelTco2e - baseForm) > 1,
        'result must NOT equal the superseded base form sum/(44/12)',
    );

    // The divisor previously implemented by mistake (88/56 = 1.571428...).
    const mistakenForm = result.sumEmissionsTco2e / (88 / 56);
    assert.ok(
        Math.abs(result.cFuelTco2e - mistakenForm) > 1,
        'result must NOT equal the mistaken sum/(88/56) form',
    );

    assert.equal(result.cFuelTco2e, result.sumEmissionsTco2e);
});

test('no divisor parameter is required or accepted', () => {
    const pd = projectDescription();
    // the fixture no longer carries parameters.carbonToCo2eFactor
    assert.equal('parameters' in pd, false, 'fixture must not declare the removed parameter');

    const result = runExpression(calcExpression(), { documents: [asDocument(pd)] });
    assert.equal(result.cFuelTco2e, result.sumEmissionsTco2e);

    // A stray legacy parameter must be ignored, not reintroduce a divisor.
    const withLegacy = projectDescription({ parameters: { carbonToCo2eFactor: 2 } });
    const legacyResult = runExpression(calcExpression(), { documents: [asDocument(withLegacy)] });
    assert.equal(
        legacyResult.cFuelTco2e,
        legacyResult.sumEmissionsTco2e,
        'a leftover parameter must not alter the result',
    );
});

test('emissions are attributed to the four methodology sources', () => {
    const result = runExpression(calcExpression(), { documents: [asDocument(projectDescription())] });
    for (const key of ['E_HARVEST', 'E_HAULING', 'E_TRANSPORT', 'E_PROCESSING']) {
        assert.ok(key in result.emissionSources, `missing source ${key}`);
        assert.ok(result.emissionSources[key] > 0, `${key} should be populated`);
        assert.ok(Array.isArray(result.emissionSourceDetail[key]), `${key} detail missing`);
    }
    assert.equal(result.ref, 'vm0010-test-project');
    assert.equal(result.year, 2026);
});

test('unknown emission sources and invalid fuel inputs are rejected', () => {
    assert.throws(
        () => runExpression(calcExpression(), {
            documents: [asDocument(projectDescription({
                fuelInputs: [{ fuelType: 'Diesel', source: 'EF_X', ipccEmissionFactor: 1, heatingValue: 1, density: 1, consumptionKl: 1 }],
            }))],
        }),
        /unknown emission source/,
    );

    assert.throws(
        () => runExpression(calcExpression(), {
            documents: [asDocument(projectDescription({
                fuelInputs: [{ fuelType: 'Diesel', source: 'E_HARVEST', ipccEmissionFactor: -1, heatingValue: 0.04, density: 840, consumptionKl: 10 }],
            }))],
        }),
        /non-negative/,
    );
});

test('zero consumption yields zero emissions (sanity bound)', () => {
    const pd = projectDescription({
        fuelInputs: [
            { fuelType: 'Diesel', source: 'E_HARVEST', ipccEmissionFactor: 74100, heatingValue: 0.043, density: 840, consumptionKl: 0 },
        ],
    });
    const result = runExpression(calcExpression(), { documents: [asDocument(pd)] });
    assert.equal(result.sumEmissionsTco2e, 0);
    assert.equal(result.cFuelTco2e, 0);
});

test('the calculation output satisfies the output schema required fields', () => {
    const result = runExpression(calcExpression(), { documents: [asDocument(projectDescription())] });
    for (const key of [
        'ref', 'year', 'emissionSources', 'emissionSourceDetail',
        'sumEmissionsTco2e', 'cFuelTco2e',
    ]) {
        assert.ok(result[key] !== undefined && result[key] !== null, `output missing ${key}`);
    }
    assert.ok(result.year >= 1900 && result.year <= 2200);
});
