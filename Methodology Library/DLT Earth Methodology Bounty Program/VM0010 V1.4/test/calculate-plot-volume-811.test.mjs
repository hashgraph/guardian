/**
 * Focused tests for VM0010 v1.4 Section 8.1.1, Equations (1) and (2):
 *
 *   V_j,i,sp = SUM_{l=1..L} V_l,j,i,sp                          (1)
 *   V_j,i|BSL = (1/SP) * SUM_sp(V_j,i,sp / A_sp)           (2)
 *
 * C&C status: NEITHER mandatory 2026 document amends Section 8.1.1.
 * The 4 September 2026 C&C amends Section 4, the Section 8.1 baseline-reassessment
 * narrative, Eq 12/13, Eq 37 and Eqs 40/41. The 11 June 2026 C&C amends only
 * the Section 8.1 baseline-averaging sentence, which concerns averaging total
 * emissions over the crediting period and multiplying by t*. Equations (1) and
 * (2) are per-hectare carbon-stock calculations involving neither t* nor
 * crediting-period averaging, so the correction does not reach them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function section811Expression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-plot-volume-811.js'), 'utf8');
}

function createValidSection811Contract() {
    return {
        id: 'vm0010-811-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        strata: [
            {
                species: 1,
                stratum: 1,
                treeVolumes: [2, 3, 5], // 3 trees: 2, 3, 5 m3 each
                plotArea: 0.5
            },
            {
                species: 2,
                stratum: 1,
                treeVolumes: [10, 20], // 2 trees: 10, 20 m3 each
                plotArea: 1.0
            }
        ],
        // Additional required fields for project description schema
        plotAreas: [
            { species: 1, stratum: 1, area: 0.5 },
            { species: 2, stratum: 1, area: 1.0 }
        ],
        infrastructureBiomass: [],
        residualStandDamage: [],
        woodProducts: [],
        deadWood: []
    };
}

test('Eq (1) matches independent hand-computation - single plot', () => {
    const contract = createValidSection811Contract();
    // Plot 1: species 1, stratum 1, trees [2,3,5] m3
    // Eq (1): 2 + 3 + 5 = 10 m3
    const expectedPlotVolume = 10;

    const result = runExpression(section811Expression(), { documents: [asDocument(contract)] });
    assert.equal(result.ref, 'vm0010-811-test');
    assert.equal(result.year, 2026);
    assert.equal(result.plotVolumes.length, 2);

    const plot = result.plotVolumes[0];
    assert.equal(plot.species, 1);
    assert.equal(plot.stratum, 1);
    assert.equal(plot.plotMerchantableVolume, expectedPlotVolume);
    assert.equal(plot.isValid, true);
});

test('Eq (1) sums multiple tree volumes correctly', () => {
    const contract = createValidSection811Contract();
    const plot = contract.strata[0];
    const expectedVolume = 2 + 3 + 5; // 10 m3

    assert.equal(plot.treeVolumes.reduce((a, b) => a + b, 0), expectedVolume);
});

test('Eq (1) validates species/stratum indices are positive integers', () => {
    for (const bad of [0, -1, 2.5]) {
        const contract = createValidSection811Contract();
        contract.strata[0].species = bad;

        assert.throws(
            () => runExpression(section811Expression(), { documents: [asDocument(contract)] }),
            /species j must be a positive integer/,
            `species ${bad} must be rejected`,
        );

        contract.strata[0].species = 1;
        contract.strata[0].stratum = bad;

        assert.throws(
            () => runExpression(section811Expression(), { documents: [asDocument(contract)] }),
            /stratum i must be a positive integer/,
            `stratum ${bad} must be rejected`,
        );
    }
});

test('Eq (1) rejects invalid tree volumes', () => {
    const contract = createValidSection811Contract();

    // NaN volume
    const contract1 = { ...contract }; // clone
    contract1.strata[0].treeVolumes = [2, NaN, 5];
    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract1)] }),
        /tree volume must be a finite number/,
    );

    // Negative volume
    const contract2 = { ...contract }; // clone
    contract2.strata[0].treeVolumes = [2, -1, 5];
    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract2)] }),
        /tree volume must be non-negative/,
    );

    // Infinity
    const contract3 = { ...contract };
    contract3.strata[0].treeVolumes = [2, Infinity, 5];
    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract3)] }),
        /tree volume must be a finite number/,
    );
});

test('Eq (1) rejects duplicate plot IDs', () => {
    const contract = createValidSection811Contract();
    contract.strata[0].plotId = 'P1';
    contract.strata[1].plotId = 'P1'; // duplicate plotId

    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract)] }),
        /duplicate plot ID: P1/,
        `duplicate plotId must be rejected`,
    );
});

test('Eq (1) allows multiple plots with same species/stratum', () => {
    const contract = createValidSection811Contract();
    contract.strata = [
        { plotId: 'P1', species: 1, stratum: 1, treeVolumes: [10], plotArea: 0.5 },
        { plotId: 'P2', species: 1, stratum: 1, treeVolumes: [30], plotArea: 1.0 },
        { plotId: 'P3', species: 2, stratum: 1, treeVolumes: [40], plotArea: 1.0 }
    ];

    const result = runExpression(section811Expression(), { documents: [asDocument(contract)] });

    // Three distinct plots
    assert.equal(result.totalPlots, 3);
    // Two species/stratum groups
    assert.equal(result.totalSpeciesStratumCombinations, 2);
});

test('Eq (1) requires at least one species/stratum combination', () => {
    const contract = createValidSection811Contract();
    contract.strata = [];

    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract)] }),
        /missing strata array or no species\/stratum combinations provided/,
    );
});

test('Eq (2) computes arithmetic mean of per-plot densities per group', () => {
    const contract = createValidSection811Contract();

    // Each group has one plot -> mean = that plot's density
    // Species 1, stratum 1: 10 m3 / 0.5 ha = 20 m3/ha
    // Species 2, stratum 1: 30 m3 / 1.0 ha = 30 m3/ha
    const result = runExpression(section811Expression(), { documents: [asDocument(contract)] });

    assert.equal(result.meanVolumes.length, 2);

    const meanForSpecies1 = result.meanVolumes.find(m => m.species === 1 && m.stratum === 1);
    const meanForSpecies2 = result.meanVolumes.find(m => m.species === 2 && m.stratum === 1);

    assert.equal(meanForSpecies1.meanVolumePerHectare, 20);
    assert.equal(meanForSpecies2.meanVolumePerHectare, 30);
});

test('Eq (2) computes arithmetic mean across multiple plots in same group (independent fixture)', () => {
    const contract = createValidSection811Contract();

    // Independent test fixture:
    // P1: species 1, stratum 1, volume 10, area 0.5 -> density 20
    // P2: species 1, stratum 1, volume 30, area 1.0 -> density 30
    // P3: species 2, stratum 1, volume 40, area 1.0 -> density 40
    contract.strata = [
        { plotId: 'P1', species: 1, stratum: 1, treeVolumes: [10], plotArea: 0.5 },
        { plotId: 'P2', species: 1, stratum: 1, treeVolumes: [30], plotArea: 1.0 },
        { plotId: 'P3', species: 2, stratum: 1, treeVolumes: [40], plotArea: 1.0 }
    ];

    const result = runExpression(section811Expression(), { documents: [asDocument(contract)] });

    // 3 distinct plots
    assert.equal(result.totalPlots, 3);
    // 2 species/stratum groups
    assert.equal(result.totalSpeciesStratumCombinations, 2);

    // Group 1 (species 1, stratum 1): mean of 20 and 30 = 25
    const meanGroup1 = result.meanVolumes.find(m => m.species === 1 && m.stratum === 1);
    assert.equal(meanGroup1.meanVolumePerHectare, 25);

    // Group 2 (species 2, stratum 1): mean of 40 = 40
    const meanGroup2 = result.meanVolumes.find(m => m.species === 2 && m.stratum === 1);
    assert.equal(meanGroup2.meanVolumePerHectare, 40);
});

test('Eq (2) validates plot areas are positive', () => {
    const contract = createValidSection811Contract();
    contract.strata[0].plotArea = 0; // Zero area

    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract)] }),
        /plot area must be positive/,
    );
});

test('Eq (2) validates plot areas are numbers', () => {
    const contract = createValidSection811Contract();
    contract.strata[0].plotArea = 'invalid'; // String area

    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract)] }),
        /plot area must be a finite number/,
    );
});

test('Eq (2) validates plot areas reject NaN and Infinity', () => {
    const contract = createValidSection811Contract();
    contract.strata[0].plotArea = NaN;

    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract)] }),
        /plot area must be a finite number/,
    );

    const contract2 = createValidSection811Contract();
    contract2.strata[0].plotArea = Infinity;

    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(contract2)] }),
        /plot area must be a finite number/,
    );
});

test('output satisfies every field required by the output schema', () => {
    const result = runExpression(section811Expression(), { documents: [asDocument(createValidSection811Contract())] });

    // Check required fields at top level
    for (const key of ['ref', 'year', 'plotVolumes', 'meanVolumes', 'totalPlots', 'totalSpeciesStratumCombinations']) {
        assert.ok(key in result, `output missing ${key}`);
    }

    // Check plotVolumes structure
    const plot = result.plotVolumes[0];
    for (const key of ['plotId', 'species', 'stratum', 'plotMerchantableVolume', 'plotArea', 'density', 'isValid']) {
        assert.ok(key in plot, `plotVolumes row missing ${key}`);
    }

    // Check meanVolumes structure
    const mean = result.meanVolumes[0];
    for (const key of ['plotId', 'species', 'stratum', 'plotMerchantableVolume', 'plotArea', 'meanVolumePerHectare', 'isValid']) {
        assert.ok(key in mean, `meanVolumes row missing ${key}`);
    }
});

test('totalPlots counts distinct plots', () => {
    const contract = createValidSection811Contract();
    contract.strata = [
        { plotId: 'P1', species: 1, stratum: 1, treeVolumes: [10], plotArea: 0.5 },
        { plotId: 'P2', species: 1, stratum: 1, treeVolumes: [30], plotArea: 1.0 },
        { plotId: 'P3', species: 2, stratum: 1, treeVolumes: [40], plotArea: 1.0 }
    ];

    const result = runExpression(section811Expression(), { documents: [asDocument(contract)] });
    assert.equal(result.totalPlots, 3);
});