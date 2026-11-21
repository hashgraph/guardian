/**
 * Focused tests for VM0010 v1.4 - Equation (34) Baseline Biomass Absent
 *
 *   B_i,t|PRJ = SUM_j(V_EX,j,i|BSL * BCEF_R); t dry matter/ha.
 *
 * C&C status: The mandatory 2026 documents do not amend Eq (34).
 * BCEF_R is supplied via A02 biomass factors (S1 p.68).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function fireDisturbanceExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-fire-disturbance-822.js'), 'utf8');
}

function createValidFireDisturbanceContract() {
    return {
        id: 'vm0010-eq34-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        strata: [
            { species: 1, stratum: 1, treeVolumes: [10, 5] },
            { species: 2, stratum: 1, treeVolumes: [8, 3] },
        ],
        plotAreas: [
            { species: 1, stratum: 1, area: 1.0 },
            { species: 2, stratum: 1, area: 1.0 },
        ],
        biomassFactors: [
            { species: 1, stratum: 1, bcefR: 0.9 },
            { species: 2, stratum: 1, bcefR: 0.77 },
        ],
        infrastructureBiomass: [],
        residualStandDamage: [],
        woodProducts: [],
        deadWood: []
    };
}

function approxEqual(actual, expected, tol = 1e-10) {
    return Math.abs(actual - expected) <= tol;
}

test('Eq (34): volumes 10,5 m3/ha and BCEF 1.2 gives 18 t dry matter/ha', () => {
    const contract = createValidFireDisturbanceContract();
    contract.strata = [{ species: 1, stratum: 1, treeVolumes: [10, 5] }];
    contract.biomassFactors = [{ species: 1, stratum: 1, bcefR: 1.2 }];
    const result = runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] });
    assert.equal(result.rows.length, 1);
    const row = result.rows[0];
    assert.equal(row.vExJiBsl, 15);
    assert.ok(approxEqual(row.bcefR, 1.2));
    assert.ok(approxEqual(row.bAbsentJiBsl, 18), `expected ~18, got ${row.bAbsentJiBsl}`);
});

test('Eq (34): sums across species within stratum', () => {
    const result = runExpression(fireDisturbanceExpression(), { documents: [asDocument(createValidFireDisturbanceContract())] });
    assert.equal(result.rows.length, 2);

    // Species 1: V_EX = 15, BCEF = 0.9 -> 13.5
    assert.ok(approxEqual(result.rows[0].bAbsentJiBsl, 13.5));
    // Species 2: V_EX = 11, BCEF = 0.77 -> 8.47
    assert.ok(approxEqual(result.rows[1].bAbsentJiBsl, 8.47));
});

test('Eq (34) rejects missing strata array', () => {
    const contract = createValidFireDisturbanceContract();
    delete contract.strata;
    assert.throws(
        () => runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] }),
        /project missing strata array/,
    );
});

test('Eq (34) rejects species index outside 1..3', () => {
    const contract = createValidFireDisturbanceContract();
    contract.strata = [{ species: 9, stratum: 1, treeVolumes: [10] }];
    assert.throws(
        () => runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] }),
        /species j must be 1, 2 or 3/,
    );
});

test('Eq (34) rejects negative tree volume', () => {
    const contract = createValidFireDisturbanceContract();
    contract.strata = [{ species: 1, stratum: 1, treeVolumes: [10, -5] }];
    assert.throws(
        () => runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] }),
        /tree volume must be non-negative/,
    );
});

test('Eq (34) rejects missing BCEF_R for stratum', () => {
    const contract = createValidFireDisturbanceContract();
    contract.biomassFactors = [{ species: 1, stratum: 1, bcefR: 0.9 }];
    // stratum 2 has no BCEF factor
    assert.throws(
        () => runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] }),
        /BCEF_R must be a finite number/,
    );
});

test('Eq (34) rejects BCEF_R <= 0', () => {
    const contract = createValidFireDisturbanceContract();
    contract.biomassFactors = [
        { species: 1, stratum: 1, bcefR: 0 },
        { species: 2, stratum: 1, bcefR: 0.77 },
    ];
    assert.throws(
        () => runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] }),
        /BCEF_R must be positive/,
    );
});

test('Eq (34) requires at least one species/stratum combination', () => {
    const contract = createValidFireDisturbanceContract();
    contract.strata = [];
    assert.throws(
        () => runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] }),
        /project missing strata array or no species\/stratum combinations provided/,
    );
});

test('Eq (34) rejects stratum index outside 1..3', () => {
    const contract = createValidFireDisturbanceContract();
    contract.strata = [{ species: 1, stratum: 0, treeVolumes: [10] }];
    assert.throws(
        () => runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] }),
        /stratum i must be 1, 2 or 3/,
    );
});

test('Eq (34) rejects non-finite tree volume', () => {
    const contract = createValidFireDisturbanceContract();
    contract.strata = [{ species: 1, stratum: 1, treeVolumes: [NaN] }];
    assert.throws(
        () => runExpression(fireDisturbanceExpression(), { documents: [asDocument(contract)] }),
        /tree volume must be a finite number/,
    );
});
