/**
 * Focused tests for VM0010 v1.4 — Equations (40)-(41) - Corrected Net Emission Reductions and Removals
 *
 * Eq (40): ER_t* = [C_FUEL - MIN(0,DC_NET|BSL,t*) + MIN(0,DC_NET|PRJ)] * (1-LF_ME) * (1-U_total|LtPF); tCO2e
 * Eq (41): CR_t* = [MAX(0,DC_NET|PRJ) - MAX(0,DC_NET|BSL,t*)] * (1-U_total|LtPF); tCO2e
 *
 * Independent test fixtures from PHASE3-CALCULATION-SPEC.md:
 *   Eq (40): C_FUEL=20, BSL=-100, PRJ=-10, LF=0.4, U=0.2 -> 110*0.6*0.8 = 52.8 tCO2e
 *   Eq (41): PRJ=100, BSL=20, U=0.2 -> 80*0.8 = 64 tCO2e
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function netBenefitsExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-net-benefits-84.js'), 'utf8');
}

function createValidNetBenefitsContract() {
    return {
        id: 'vm0010-net-benefits-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        cFuel: 20,
        dcNetBsl: -100,
        dcNetPrj: -10,
        lfMe: 0.4,
        uTotal: 0.2,
    };
}

test('Eq (40) matches independent hand-computation', () => {
    const contract = createValidNetBenefitsContract();
    const result = runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] });
    // C_FUEL=20, BSL=-100, PRJ=-10, LF=0.4, U=0.2
    // numerator = 20 - (-100) + (-10) = 110
    // ER = 110 * 0.6 * 0.8 = 52.8
    assert.ok(Math.abs(result.erTco2e - 52.8) < 1e-9, `ER_t* = ${result.erTco2e}, expected 52.8`);
});

test('Eq (41) matches independent hand-computation', () => {
    const contract = createValidNetBenefitsContract();
    const result = runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] });
    // PRJ=-10, BSL=-100, U=0.2
    // numerator = MAX(0,-10) - MAX(0,-100) = 0 - 0 = 0
    // CR = 0 * 0.8 = 0
    assert.ok(Math.abs(result.crTco2e - 0) < 1e-9, `CR_t* = ${result.crTco2e}, expected 0`);
});

test('Eq (41) for net removals case', () => {
    const contract = {
        id: 'vm0010-net-removals-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        cFuel: 0,
        dcNetBsl: 20,
        dcNetPrj: 100,
        lfMe: 0,
        uTotal: 0.2,
    };
    const result = runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] });
    // PRJ=100, BSL=20, U=0.2
    // numerator = MAX(0,100) - MAX(0,20) = 100 - 20 = 80
    // CR = 80 * 0.8 = 64
    assert.ok(Math.abs(result.crTco2e - 64) < 1e-9, `CR_t* = ${result.crTco2e}, expected 64`);
});

test('Eq (40) with zero leakage and uncertainty', () => {
    const contract = {
        id: 'vm0010-no-buffer-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        cFuel: 20,
        dcNetBsl: -100,
        dcNetPrj: -10,
        lfMe: 0,
        uTotal: 0,
    };
    const result = runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] });
    // numerator = 110, no multipliers
    assert.ok(Math.abs(result.erTco2e - 110) < 1e-9, `ER_t* = ${result.erTco2e}, expected 110`);
});

test('Eq (41) with LF provided but U applied only (no LF multiplier per methodology)', () => {
    const contract = {
        id: 'vm0010-lf-ignored-for-cr',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        cFuel: 0,
        dcNetBsl: 0,
        dcNetPrj: 100,
        lfMe: 0.25,
        uTotal: 0.1,
    };
    const result = runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] });
    // ER: numerator = 0 - 0 + 0 = 0, ER = 0 * 0.75 * 0.9 = 0
    // CR: numerator = MAX(0,100) - MAX(0,0) = 100 - 0 = 100; LF ignored per Eq (41); CR = 100 * 0.9 = 90
    assert.ok(Math.abs(result.erTco2e - 0) < 1e-9, `ER_t* = ${result.erTco2e}, expected 0`);
    assert.ok(Math.abs(result.crTco2e - 90) < 1e-9, `CR_t* = ${result.crTco2e}, expected 90`);
});

test('Eq (40) rejects missing C_FUEL', () => {
    const contract = createValidNetBenefitsContract();
    delete contract.cFuel;
    assert.throws(
        () => runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] }),
        /C_FUEL must be a finite number >= 0/,
    );
});

test('Eq (40) rejects negative C_FUEL', () => {
    const contract = createValidNetBenefitsContract();
    contract.cFuel = -5;
    assert.throws(
        () => runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] }),
        /C_FUEL must be a finite number >= 0/,
    );
});

test('Eq (40) rejects invalid LF_ME above 1', () => {
    const contract = createValidNetBenefitsContract();
    contract.lfMe = 1.5;
    assert.throws(
        () => runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] }),
        /LF_ME must be in \[0,1\]/,
    );
});

test('Eq (40) rejects invalid U_TOTAL above 1', () => {
    const contract = createValidNetBenefitsContract();
    contract.uTotal = 1.5;
    assert.throws(
        () => runExpression(netBenefitsExpression(), { documents: [asDocument(contract)] }),
        /U_TOTAL must be in \[0,1\]/,
    );
});

test('output satisfies schema requirements', () => {
    const result = runExpression(netBenefitsExpression(), { documents: [asDocument(createValidNetBenefitsContract())] });
    for (const key of ['ref', 'year', 'erTco2e', 'crTco2e']) {
        assert.ok(key in result, `output missing ${key}`);
    }
});
