/**
 * Focused tests for VM0010 v1.4 - Equation (42) Combined Uncertainty
 *
 *   U_total|LtPF = SQRT(U_PRJ^2 + U_BSL^2); dimensionless
 *
 * C&C status: The mandatory 2026 documents do not amend the uncertainty
 * combination rule (Eq 42) on S1 p.51.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function uncertaintyExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-uncertainty-85.js'), 'utf8');
}

function createValidUncertaintyContract() {
    return {
        id: 'vm0010-eq42-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        scenarioUncertainty: {
            uPrj: 0.12,
            uBsl: 0.16,
        },
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

test('Eq (42): SQRT(0.12^2 + 0.16^2) = 0.20', () => {
    const result = runExpression(uncertaintyExpression(), { documents: [asDocument(createValidUncertaintyContract())] });
    assert.ok(approxEqual(result.uPrj, 0.12));
    assert.ok(approxEqual(result.uBsl, 0.16));
    assert.ok(approxEqual(result.uTotal, 0.20), `expected ~0.20, got ${result.uTotal}`);
});

test('Eq (42): SQRT(0.09^2 + 0.12^2) = 0.15', () => {
    const contract = createValidUncertaintyContract();
    contract.scenarioUncertainty = { uPrj: 0.09, uBsl: 0.12 };
    const result = runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] });
    assert.ok(approxEqual(result.uPrj, 0.09));
    assert.ok(approxEqual(result.uBsl, 0.12));
    assert.ok(approxEqual(result.uTotal, 0.15), `expected ~0.15, got ${result.uTotal}`);
});

test('Eq (42): both zero yields zero', () => {
    const contract = createValidUncertaintyContract();
    contract.scenarioUncertainty = { uPrj: 0, uBsl: 0 };
    const result = runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] });
    assert.ok(approxEqual(result.uTotal, 0));
});

test('Eq (42): U_PRJ=1, U_BSL=1 yields SQRT(2)', () => {
    const contract = createValidUncertaintyContract();
    contract.scenarioUncertainty = { uPrj: 1, uBsl: 1 };
    const result = runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] });
    assert.ok(approxEqual(result.uTotal, Math.sqrt(2)));
});

test('Eq (42) rejects missing scenarioUncertainty', () => {
    const contract = createValidUncertaintyContract();
    delete contract.scenarioUncertainty;
    assert.throws(
        () => runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] }),
        /missing scenarioUncertainty object/,
    );
});

test('Eq (42) rejects non-finite U_PRJ', () => {
    const contract = createValidUncertaintyContract();
    contract.scenarioUncertainty = { uPrj: NaN, uBsl: 0.16 };
    assert.throws(
        () => runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] }),
        /U_PRJ must be a finite number/,
    );
});

test('Eq (42) rejects non-finite U_BSL', () => {
    const contract = createValidUncertaintyContract();
    contract.scenarioUncertainty = { uPrj: 0.12, uBsl: Infinity };
    assert.throws(
        () => runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] }),
        /U_BSL must be a finite number/,
    );
});

test('Eq (42) rejects U_PRJ outside [0,1]', () => {
    const contract = createValidUncertaintyContract();
    contract.scenarioUncertainty = { uPrj: 1.5, uBsl: 0.16 };
    assert.throws(
        () => runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] }),
        /U_PRJ must be in \[0,1\]/,
    );
});

test('Eq (42) rejects U_BSL outside [0,1]', () => {
    const contract = createValidUncertaintyContract();
    contract.scenarioUncertainty = { uPrj: 0.12, uBsl: -0.1 };
    assert.throws(
        () => runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] }),
        /U_BSL must be in \[0,1\]/,
    );
});

test('Eq (42) rejects U_PRJ below 0', () => {
    const contract = createValidUncertaintyContract();
    contract.scenarioUncertainty = { uPrj: -0.05, uBsl: 0.16 };
    assert.throws(
        () => runExpression(uncertaintyExpression(), { documents: [asDocument(contract)] }),
        /U_PRJ must be in \[0,1\]/,
    );
});
