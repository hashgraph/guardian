/**
 * Focused tests for VM0010 v1.4 - Equation A02 Biomass Factor Construction
 *
 *   BCEF_R = BEF_R * D      (t dry matter / m3)
 *
 * C&C status: The mandatory 2026 documents do not amend the BEF-density
 * relation (A02). Same-sample or locally checked applicability/correlation
 * evidence is mandatory per S1 p.68.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function biomassFactorsExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-biomass-factors.js'), 'utf8');
}

function createValidBiomassContract() {
    return {
        id: 'vm0010-a02-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        biomassFactors: [
            { species: 1, stratum: 1, befR: 1.5, d: 0.6 }
        ],
        strata: [],
        infrastructureBiomass: [],
        residualStandDamage: [],
        woodProducts: [],
        deadWood: []
    };
}

function approxEqual(actual, expected, tol = 1e-10) {
    return Math.abs(actual - expected) <= tol;
}

test('A02 BEF 1.5 and density 0.6 gives BCEF_R 0.9', () => {
    const result = runExpression(biomassFactorsExpression(), { documents: [asDocument(createValidBiomassContract())] });
    assert.equal(result.rows.length, 1);

    const row = result.rows[0];
    assert.equal(row.befR, 1.5);
    assert.equal(row.d, 0.6);
    assert.ok(approxEqual(row.bcefR, 0.9), `expected ~0.9, got ${row.bcefR}`); // BCEF_R = 1.5 * 0.6
});

test('A02 computes BCEF_R for multiple species/strata', () => {
    const contract = createValidBiomassContract();
    contract.biomassFactors = [
        { species: 1, stratum: 1, befR: 1.5, d: 0.6 },
        { species: 2, stratum: 2, befR: 1.4, d: 0.55 },
        { species: 3, stratum: 3, befR: 1.6, d: 0.7 }
    ];
    const result = runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] });
    assert.equal(result.rows.length, 3);

    assert.ok(approxEqual(result.rows[0].bcefR, 0.9), `expected ~0.9, got ${result.rows[0].bcefR}`);   // 1.5 * 0.6
    assert.ok(approxEqual(result.rows[1].bcefR, 0.77), `expected ~0.77, got ${result.rows[1].bcefR}`);  // 1.4 * 0.55
    assert.ok(approxEqual(result.rows[2].bcefR, 1.12), `expected ~1.12, got ${result.rows[2].bcefR}`);  // 1.6 * 0.7
});

test('A02 rejects BEF_R <= 0', () => {
    const contract = createValidBiomassContract();
    contract.biomassFactors = [{ species: 1, stratum: 1, befR: 0, d: 0.6 }];
    assert.throws(
        () => runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] }),
        /BEF_R must be positive/,
    );
});

test('A02 rejects density D <= 0', () => {
    const contract = createValidBiomassContract();
    contract.biomassFactors = [{ species: 1, stratum: 1, befR: 1.5, d: 0 }];
    assert.throws(
        () => runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] }),
        /D must be positive/,
    );
});

test('A02 rejects non-finite BEF_R', () => {
    const contract = createValidBiomassContract();
    contract.biomassFactors = [{ species: 1, stratum: 1, befR: NaN, d: 0.6 }];
    assert.throws(
        () => runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] }),
        /BEF_R must be a finite number/,
    );
});

test('A02 rejects non-finite density D', () => {
    const contract = createValidBiomassContract();
    contract.biomassFactors = [{ species: 1, stratum: 1, befR: 1.5, d: Infinity }];
    assert.throws(
        () => runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] }),
        /D must be a finite number/,
    );
});

test('A02 rejects missing biomassFactors array', () => {
    const contract = createValidBiomassContract();
    delete contract.biomassFactors;
    assert.throws(
        () => runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] }),
        /missing biomassFactors array/,
    );
});

test('A02 requires at least one species/stratum combination', () => {
    const contract = createValidBiomassContract();
    contract.biomassFactors = [];
    assert.throws(
        () => runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] }),
        /no factor combinations provided/,
    );
});

test('A02 rejects species index outside 1..3', () => {
    const contract = createValidBiomassContract();
    contract.biomassFactors = [{ species: 9, stratum: 1, befR: 1.5, d: 0.6 }];
    assert.throws(
        () => runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] }),
        /species j must be 1, 2 or 3/,
    );
});

test('A02 rejects stratum index outside 1..3', () => {
    const contract = createValidBiomassContract();
    contract.biomassFactors = [{ species: 1, stratum: 0, befR: 1.5, d: 0.6 }];
    assert.throws(
        () => runExpression(biomassFactorsExpression(), { documents: [asDocument(contract)] }),
        /stratum i must be 1, 2 or 3/,
    );
});
