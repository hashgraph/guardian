/**
 * Focused tests for VM0010 v1.4 — Equation (47) - Non-CO2 Equivalent Emission Factor
 *
 *   EF = EF_CH4 * GWP_CH4 + EF_N2O * GWP_N2O        (tCO2e per activity unit)
 *
 * Independent test fixture from PHASE3-CALCULATION-SPEC.md:
 *   synthetic EF_CH4=0.01, GWP_CH4=20, EF_N2O=0.001, GWP_N2O=100 -> 0.3 tCO2e/activity
 *
 * C&C status: The mandatory 2026 documents do not amend Appendix 1 Equation (47).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function nonCo2Expression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-non-co2-emission-factor.js'), 'utf8');
}

function createValidNonCo2Contract() {
    return {
        id: 'vm0010-eq47-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        ghgFactors: [
            {
                gas: 'CH4_N2O',
                activity: 'kL_fuel',
                efCh4: 0.01,    // tCH4 per activity unit
                gwpCh4: 20,     // dimensionless
                efN2o: 0.001,   // tN2O per activity unit
                gwpN2o: 100     // dimensionless
            }
        ],
        infrastructureBiomass: [],
        residualStandDamage: [],
        woodProducts: [],
        deadWood: []
    };
}

function approxEqual(actual, expected, tolerance = 1e-12) {
    return Math.abs(actual - expected) < tolerance;
}

test('Eq (47) matches independent hand-computation', () => {
    const contract = createValidNonCo2Contract();
    const result = runExpression(nonCo2Expression(), { documents: [asDocument(contract)] });
    assert.equal(result.rows.length, 1);
    assert.ok(approxEqual(result.rows[0].efTco2ePerActivity, 0.3));
    assert.ok(approxEqual(result.rows[0].efCh4, 0.01));
    assert.ok(approxEqual(result.rows[0].efN2o, 0.001));
    assert.equal(result.rows[0].gwpCh4, 20);
    assert.equal(result.rows[0].gwpN2o, 100);
    assert.equal(result.rows[0].activity, 'kL_fuel');
});

test('Eq (47) rejects negative EF_CH4', () => {
    const contract = createValidNonCo2Contract();
    contract.ghgFactors[0].efCh4 = -0.01;
    assert.throws(
        () => runExpression(nonCo2Expression(), { documents: [asDocument(contract)] }),
        /EF_CH4 must be non-negative/,
    );
});

test('Eq (47) rejects negative EF_N2O', () => {
    const contract = createValidNonCo2Contract();
    contract.ghgFactors[0].efN2o = -0.001;
    assert.throws(
        () => runExpression(nonCo2Expression(), { documents: [asDocument(contract)] }),
        /EF_N2O must be non-negative/,
    );
});

test('Eq (47) rejects non-positive GWP_CH4', () => {
    const contract = createValidNonCo2Contract();
    contract.ghgFactors[0].gwpCh4 = 0;
    assert.throws(
        () => runExpression(nonCo2Expression(), { documents: [asDocument(contract)] }),
        /GWP_CH4 must be positive/,
    );

    contract.ghgFactors[0].gwpCh4 = -5;
    assert.throws(
        () => runExpression(nonCo2Expression(), { documents: [asDocument(contract)] }),
        /GWP_CH4 must be positive/,
    );
});

test('Eq (47) rejects non-positive GWP_N2O', () => {
    const contract = createValidNonCo2Contract();
    contract.ghgFactors[0].gwpN2o = 0;
    assert.throws(
        () => runExpression(nonCo2Expression(), { documents: [asDocument(contract)] }),
        /GWP_N2O must be positive/,
    );
});

test('Eq (47) rejects NaN and Infinity', () => {
    const contract = createValidNonCo2Contract();
    contract.ghgFactors[0].efCh4 = NaN;
    assert.throws(
        () => runExpression(nonCo2Expression(), { documents: [asDocument(contract)] }),
        /EF_CH4 must be a finite number/,
    );

    contract.ghgFactors[0].efCh4 = Infinity;
    assert.throws(
        () => runExpression(nonCo2Expression(), { documents: [asDocument(contract)] }),
        /EF_CH4 must be a finite number/,
    );
});

test('Eq (47) requires at least one GHG factor row', () => {
    const contract = createValidNonCo2Contract();
    contract.ghgFactors = [];
    assert.throws(
        () => runExpression(nonCo2Expression(), { documents: [asDocument(contract)] }),
        /at least one GHG factor row is required/,
    );
});

test('Eq (47) preserves activity metadata per row, does not sum across activities', () => {
    const contract = createValidNonCo2Contract();
    contract.ghgFactors = [
        {
            gas: 'CH4_N2O',
            activity: 'kL_fuel',
            efCh4: 0.01,
            gwpCh4: 20,
            efN2o: 0.001,
            gwpN2o: 100
        },
        {
            gas: 'CH4_N2O',
            activity: 'kWh_grid',
            efCh4: 0.005,
            gwpCh4: 28,
            efN2o: 0.0005,
            gwpN2o: 265
        }
    ];
    const result = runExpression(nonCo2Expression(), { documents: [asDocument(contract)] });
    assert.equal(result.rows.length, 2);
    assert.ok(approxEqual(result.rows[0].efTco2ePerActivity, 0.3));
    // 0.005 * 28 + 0.0005 * 265 = 0.14 + 0.1325 = 0.2725
    assert.ok(approxEqual(result.rows[1].efTco2ePerActivity, 0.2725));
    assert.equal(result.rows[0].activity, 'kL_fuel');
    assert.equal(result.rows[1].activity, 'kWh_grid');
    // Schema requires a raw sum field; callers must verify dimensional
    // compatibility before using it — incompatible activities are NOT merged.
    assert.ok('sumEfTco2ePerActivity' in result, 'schema requires sumEfTco2ePerActivity');
    assert.ok(approxEqual(result.sumEfTco2ePerActivity, 0.5725));
    assert.notEqual(result.rows[0].activity, result.rows[1].activity);
});

test('Eq (47) supports multiple rows with same activity for aggregation by caller', () => {
    const contract = createValidNonCo2Contract();
    contract.ghgFactors = [
        {
            gas: 'CH4_N2O',
            activity: 'kL_fuel',
            efCh4: 0.01,
            gwpCh4: 20,
            efN2o: 0.001,
            gwpN2o: 100
        },
        {
            gas: 'CH4_N2O',
            activity: 'kL_fuel',
            efCh4: 0.005,
            gwpCh4: 28,
            efN2o: 0.0005,
            gwpN2o: 265
        }
    ];
    const result = runExpression(nonCo2Expression(), { documents: [asDocument(contract)] });
    assert.equal(result.rows.length, 2);
    assert.ok(approxEqual(result.rows[0].efTco2ePerActivity, 0.3));
    assert.ok(approxEqual(result.rows[1].efTco2ePerActivity, 0.2725));
    // Caller may sum rows with same activity if dimensional compatibility is confirmed
    assert.equal(result.rows[0].activity, result.rows[1].activity);
});