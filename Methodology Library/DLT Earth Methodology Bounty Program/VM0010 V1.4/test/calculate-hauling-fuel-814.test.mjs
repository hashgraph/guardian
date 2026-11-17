/**
 * Focused tests for VM0010 v1.4 — Equation (16) - Log Hauling Emissions
 *
 *   E_HAULING = FC_HAULING * EF_FUEL * SUM_{j,i}(V_EX,j,i|BSL * A_i); tCO2e
 *
 * Independent test fixture from PHASE3-CALCULATION-SPEC.md:
 *   volume 100 m3, rate 0.002 kL/m3, EF 2.5 -> 0.5 tCO2e
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function haulingExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-hauling-fuel-814.js'), 'utf8');
}

function createValidHaulingContract() {
    return {
        id: 'vm0010-hauling-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fcHauling: 0.002,
        efFuel: 2.5,
        strata: [
            { species: 1, stratum: 1, treeVolumes: [10, 20, 30], plotArea: 0.5 },
        ],
        plotAreas: [
            { species: 1, stratum: 1, area: 0.5 },
        ],
        fuelInputs: [],
        infrastructureBiomass: [],
        residualStandDamage: [],
        woodProducts: [],
        deadWood: []
    };
}

test('Eq (16) matches independent hand-computation', () => {
    // Spec fixture: V_EX=100 m3/ha, area 1 ha, rate 0.002 kL/m3, EF 2.5
    // E_HAULING = 0.002 * 2.5 * 100 * 1 = 0.5 tCO2e
    const contract = createValidHaulingContract();
    contract.strata[0].treeVolumes = [100];
    contract.strata[0].plotArea = 1.0;
    contract.plotAreas[0].area = 1.0;
    const result = runExpression(haulingExpression(), { documents: [asDocument(contract)] });
    assert.ok(Math.abs(result.haulingFuelEmissions - 0.5) < 1e-9, `E_HAULING = ${result.haulingFuelEmissions}`);
});

test('Eq (16) fixture 0.5 tCO2e hauling', () => {
    // volume 100 m3, area 1.0 ha, rate 0.002 kL/m3, EF 2.5
    // E_HAULING = 0.002 * 2.5 * 100 * 1.0 = 0.5 tCO2e
    const contract = createValidHaulingContract();
    contract.strata[0].treeVolumes = [100];
    contract.strata[0].plotArea = 1.0;
    contract.plotAreas[0].area = 1.0;
    const result = runExpression(haulingExpression(), { documents: [asDocument(contract)] });
    assert.ok(Math.abs(result.haulingFuelEmissions - 0.5) < 1e-9, `E_HAULING = ${result.haulingFuelEmissions}`);
});

test('Eq (16) sums across multiple species/strata', () => {
    const contract = createValidHaulingContract();
    contract.strata = [
        { species: 1, stratum: 1, treeVolumes: [10, 20, 30], plotArea: 0.5 },
        { species: 2, stratum: 1, treeVolumes: [15, 25], plotArea: 1.0 },
    ];
    contract.plotAreas = [
        { species: 1, stratum: 1, area: 0.5 },
        { species: 2, stratum: 1, area: 1.0 },
    ];
    const result = runExpression(haulingExpression(), { documents: [asDocument(contract)] });
    // (60*0.5 + 40*1.0) * 0.002 * 2.5 = (30+40)*0.005 = 0.35 tCO2e
    assert.ok(Math.abs(result.haulingFuelEmissions - 0.35) < 1e-9, `E_HAULING = ${result.haulingFuelEmissions}`);
    assert.equal(result.haulingFuelDetails.length, 2);
});

test('Eq (16) rejects missing FC_HAULING', () => {
    const contract = createValidHaulingContract();
    delete contract.fcHauling;
    assert.throws(
        () => runExpression(haulingExpression(), { documents: [asDocument(contract)] }),
        /FC_HAULING must be a finite number/,
    );
});

test('Eq (16) rejects negative FC_HAULING', () => {
    const contract = createValidHaulingContract();
    contract.fcHauling = -0.001;
    assert.throws(
        () => runExpression(haulingExpression(), { documents: [asDocument(contract)] }),
        /FC_HAULING must be non-negative/,
    );
});

test('Eq (16) rejects missing EF_FUEL', () => {
    const contract = createValidHaulingContract();
    delete contract.efFuel;
    assert.throws(
        () => runExpression(haulingExpression(), { documents: [asDocument(contract)] }),
        /EF_FUEL must be a finite number/,
    );
});

test('Eq (16) rejects negative EF_FUEL', () => {
    const contract = createValidHaulingContract();
    contract.efFuel = -2.5;
    assert.throws(
        () => runExpression(haulingExpression(), { documents: [asDocument(contract)] }),
        /EF_FUEL must be non-negative/,
    );
});

test('Eq (16) rejects missing strata array', () => {
    const contract = createValidHaulingContract();
    contract.strata = [];
    assert.throws(
        () => runExpression(haulingExpression(), { documents: [asDocument(contract)] }),
        /missing strata array or no species\/stratum combinations provided/,
    );
});

test('Eq (16) rejects missing plotAreas array', () => {
    const contract = createValidHaulingContract();
    delete contract.plotAreas;
    assert.throws(
        () => runExpression(haulingExpression(), { documents: [asDocument(contract)] }),
        /missing plotAreas array for hauling calculation/,
    );
});

test('output satisfies every field required by the output schema', () => {
    const result = runExpression(haulingExpression(), { documents: [asDocument(createValidHaulingContract())] });
    for (const key of ['ref', 'year', 'haulingFuelEmissions', 'haulingFuelDetails']) {
        assert.ok(key in result, `output missing ${key}`);
    }
    const detail = result.haulingFuelDetails[0];
    for (const key of ['plotId', 'species', 'stratum', 'areaHa', 'volumeEx', 'fuelConsumption', 'emissionsTco2e']) {
        assert.ok(key in detail, `haulingFuelDetails row missing ${key}`);
    }
});