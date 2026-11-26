/**
 * Focused tests for VM0010 v1.4 — Eqs (29)-(33) Project Stock and Disturbance
 *
 * C&C status: Eqs (29)-(33) are not amended by mandatory 2026 documents.
 * Eq (29) needs validated allometry; Eqs (30)-(33) use explicit inputs.
 * Eq (33) now integrates Eq (34)'s B_i,t|PRJ via A02 biomass factors.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function projectStocksExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-project-stocks-821.js'), 'utf8');
}

function approxEqual(actual, expected, tol = 1e-10) {
    return Math.abs(actual - expected) <= tol;
}

function createValidProjectStocksContract() {
    return {
        id: 'vm0010-stock-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        strata: [
            { species: 1, stratum: 1, treeVolumes: [10, 20, 30] },
            { species: 2, stratum: 1, treeVolumes: [15, 25] }
        ],
        plotAreas: [
            { species: 1, stratum: 1, area: 0.5 },
            { species: 2, stratum: 1, area: 1.0 }
        ],
        monitoringInterval: {
            t1: 2018,
            t2: 2023,
            areas: [
                { species: 1, stratum: 1, area: 0.5, cAbT1: 10, cAbT2: 15 },
                { species: 2, stratum: 1, area: 1.0, cAbT1: 8, cAbT2: 12 }
            ]
        },
        fireData: [
            { species: 1, stratum: 1, area: 0.2, combustionFraction: 0.5, methaneEf: 10, gwp: 21 }
        ],
        biomassFactors: [
            { species: 1, stratum: 1, befR: 1.5, d: 0.6 },      // bcefR = 0.9
            { species: 2, stratum: 1, befR: 1.4, d: 0.55 }      // bcefR = 0.77
        ],
        fuelInputs: [],
        infrastructureBiomass: [],
        residualStandDamage: [],
        woodProducts: [],
        deadWood: []
    };
}

test('Eq (30) calculates plot carbon across species', () => {
    const result = runExpression(projectStocksExpression(), { documents: [asDocument(createValidProjectStocksContract())] });
    assert.ok(result.plotCarbon !== undefined, 'plotCarbon should be defined in result');
    assert.ok(result.plotCarbon.length > 0, 'plotCarbon should have at least one entry');
    assert.equal(result.plotCarbon[0].species, 1);
    assert.equal(result.plotCarbon[0].stratum, 1);
    assert.ok(result.plotCarbon[0].carbontPerHectare > 0);
});

test('Eq (31) calculates mean stock density', () => {
    const result = runExpression(projectStocksExpression(), { documents: [asDocument(createValidProjectStocksContract())] });
    assert.ok(result.meanStockDensity !== undefined, 'meanStockDensity should be defined in result');
    assert.ok(result.meanStockDensity.length > 0, 'meanStockDensity should have at least one entry');
    assert.ok(result.meanStockDensity[0].carbontPerHectare > 0);
});

test('Eq (32) calculates annual stock gain', () => {
    const result = runExpression(projectStocksExpression(), { documents: [asDocument(createValidProjectStocksContract())] });
    assert.ok(result.annualStockGainTco2e !== undefined);
    assert.ok(typeof result.annualStockGainTco2e === 'number');
});

test('Eq (34) computes B_i,t|PRJ for fire methane calculation', () => {
    const result = runExpression(projectStocksExpression(), { documents: [asDocument(createValidProjectStocksContract())] });
    assert.ok(result.bAbsentLookup !== undefined, 'bAbsentLookup should be defined (Eq 34 output)');
    assert.ok(result.bAbsentLookup['1:1'] !== undefined, 'B_i,t|PRJ for species 1 stratum 1 should exist');
    assert.ok(result.bAbsentLookup['2:1'] !== undefined, 'B_i,t|PRJ for species 2 stratum 1 should exist');

    // Species 1: V_EX = 60, BCEF = 0.9 -> B = 54
    assert.ok(approxEqual(result.bAbsentLookup['1:1'], 54), 'B for species 1 stratum 1 should be 54, got ' + result.bAbsentLookup['1:1']);
    // Species 2: V_EX = 40, BCEF = 0.77 -> B = 30.8
    assert.ok(approxEqual(result.bAbsentLookup['2:1'], 30.8), 'B for species 2 stratum 1 should be 30.8, got ' + result.bAbsentLookup['2:1']);
});

test('Eq (33) integrates Eq (34) B_i,t|PRJ into fire methane emissions', () => {
    const result = runExpression(projectStocksExpression(), { documents: [asDocument(createValidProjectStocksContract())] });
    assert.ok(result.fireMethaneEmissions >= 0);
    assert.equal(result.fireDetails.length, 1);

    // Species 1 stratum 1: area=0.2, B=54, COMF=0.5, G_CH4=10, GWP=21
    // emission = 0.2 * 54 * 0.5 * 10 * 1e-3 * 21 = 0.1134 tCO2e
    const expectedEmission = 0.2 * 54 * 0.5 * 10 * 1e-3 * 21;
    assert.ok(approxEqual(result.fireDetails[0].emissionsTco2e, expectedEmission),
        'fire methane emission should be ' + expectedEmission + ', got ' + result.fireDetails[0].emissionsTco2e);
    assert.equal(result.fireDetails[0].species, 1);
    assert.equal(result.fireDetails[0].stratum, 1);
    assert.ok(approxEqual(result.fireDetails[0].baselineBiomass, 54));
});

test('Eq (33) processes multiple fire strata with distinct B_i,t|PRJ values', () => {
    const contract = createValidProjectStocksContract();
    contract.fireData = [
        { species: 1, stratum: 1, area: 0.2, combustionFraction: 0.5, methaneEf: 10, gwp: 21 },
        { species: 2, stratum: 1, area: 0.3, combustionFraction: 0.4, methaneEf: 8, gwp: 21 }
    ];
    const result = runExpression(projectStocksExpression(), { documents: [asDocument(contract)] });
    assert.equal(result.fireDetails.length, 2);

    // Species 1: B=54, emission = 0.2 * 54 * 0.5 * 10 * 1e-3 * 21 = 1.134
    // Species 2: B=30.8, emission = 0.3 * 30.8 * 0.4 * 8 * 1e-3 * 21 = 0.620928
    const expected1 = 0.2 * 54 * 0.5 * 10 * 1e-3 * 21;
    const expected2 = 0.3 * 30.8 * 0.4 * 8 * 1e-3 * 21;
    const expectedTotal = expected1 + expected2;
    assert.ok(approxEqual(result.fireMethaneEmissions, expectedTotal),
        'total fire methane should be ' + expectedTotal + ', got ' + result.fireMethaneEmissions);
});

test('Eq (33) rejects fire data missing species/stratum for B_i,t|PRJ lookup', () => {
    const contract = createValidProjectStocksContract();
    contract.fireData = [
        { species: 9, stratum: 1, area: 0.2, combustionFraction: 0.5, methaneEf: 10, gwp: 21 }
    ];
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /species j must be 1, 2 or 3/,
    );
});

test('Eq (33) rejects fire data with stratum outside 1..3', () => {
    const contract = createValidProjectStocksContract();
    contract.fireData = [
        { species: 1, stratum: 0, area: 0.2, combustionFraction: 0.5, methaneEf: 10, gwp: 21 }
    ];
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /stratum i must be 1, 2 or 3/,
    );
});

test('Eq (33) rejects missing Eq (34) B_i,t|PRJ for fire stratum', () => {
    const contract = createValidProjectStocksContract();
    contract.fireData = [
        { species: 1, stratum: 2, area: 0.2, combustionFraction: 0.5, methaneEf: 10, gwp: 21 }
    ];
    // No biomass factor for species 1 stratum 2
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /no Eq \(34\) baseline biomass/,
    );
});

test('Eq (33) rejects negative fire area', () => {
    const contract = createValidProjectStocksContract();
    contract.fireData[0].area = -0.1;
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /fire area must be non-negative/,
    );
});

test('Eq (33) rejects invalid COMF_i', () => {
    const contract = createValidProjectStocksContract();
    contract.fireData[0].combustionFraction = 1.5;
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /COMF_i must be in \[0,1\]/,
    );
});

test('Eq (33) rejects invalid methane EF', () => {
    const contract = createValidProjectStocksContract();
    contract.fireData[0].methaneEf = -1;
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /methane EF G_CH4,i must be non-negative/,
    );
});

test('Eq (33) rejects invalid GWP_CH4', () => {
    const contract = createValidProjectStocksContract();
    contract.fireData[0].gwp = 0;
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /GWP_CH4 must be positive/,
    );
});

test('Eq (33) rejects missing biomassFactors for Eq (34)', () => {
    const contract = createValidProjectStocksContract();
    delete contract.biomassFactors;
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /missing biomassFactors array/,
    );
});

test('rejects invalid species/stratum indices in strata', () => {
    const contract = createValidProjectStocksContract();
    contract.strata[0].species = 5;
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /species j must be 1, 2 or 3/,
    );
});

test('rejects invalid monitoring interval', () => {
    const contract = createValidProjectStocksContract();
    contract.monitoringInterval = { t1: 2023, t2: 2020, areas: [] };
    assert.throws(
        () => runExpression(projectStocksExpression(), { documents: [asDocument(contract)] }),
        /monitoringInterval requires t1 and t2 with t2 > t1/,
    );
});
