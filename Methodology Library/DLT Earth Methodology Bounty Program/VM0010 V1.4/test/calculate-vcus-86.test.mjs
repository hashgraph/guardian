/**
 * Focused tests for VM0010 v1.4 — Equations (43)-(46) - Buffer and VCU Arithmetic
 *
 * Eq (43): Bu_CR,t* = [MAX(0,DC_NET|PRJ) - MAX(0,C_NET|BSL,t*)] * NPR%; tCO2e buffer quantity
 * Eq (44): Bu_ER,t* = [MIN(0,DC_NET|PRJ) - MIN(0,C_NET|BSL,t*)] * NPR%; tCO2e buffer quantity
 * Eq (45): VCU_CR,t* = CR_t* - Bu_CR,t*; VCU-equivalent tCO2e before registry issuance
 * Eq (46): VCU_ER,t* = ER_t* - Bu_ER*t*; VCU-equivalent tCO2e before registry issuance
 *
 * Independent test fixtures from PHASE3-CALCULATION-SPEC.md:
 *   Eq (43): PRJ=100, BSL=20, NPR=0.20 -> 16 tCO2e buffer
 *   Eq (44): PRJ=-10, BSL=-100, NPR=0.20 -> 18 tCO2e; reversed changes -> -18 (review case)
 *   Eq (45): CR_t*=64, Bu_CR=16 -> 48
 *   Eq (46): ER_t*=52.8, Bu_ER=18 -> 34.8
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function vcusExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-vcus-86.js'), 'utf8');
}

function createValidVcusContract() {
    return {
        id: 'vm0010-vcus-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        dcNetPrj: 100,
        cNetBsl: 20,
        nprPct: 0.20,
        crTco2e: 64,
        erTco2e: 52.8,
    };
}

test('Eq (43) removals buffer matches independent hand-computation', () => {
    const contract = createValidVcusContract();
    const result = runExpression(vcusExpression(), { documents: [asDocument(contract)] });
    // [MAX(0,100) - MAX(0,20)] * 0.20 = [100 - 20] * 0.20 = 80 * 0.20 = 16
    assert.ok(Math.abs(result.buCrTco2e - 16) < 1e-9, `Bu_CR,t* = ${result.buCrTco2e}, expected 16`);
});

test('Eq (44) reductions buffer matches independent hand-computation', () => {
    const contract = {
        id: 'vm0010-vcus-reductions-buffer',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        dcNetPrj: -10,
        cNetBsl: -100,
        nprPct: 0.20,
        crTco2e: 0,
        erTco2e: 52.8,
    };
    const result = runExpression(vcusExpression(), { documents: [asDocument(contract)] });
    // [MIN(0,-10) - MIN(0,-100)] * 0.20 = [-10 - (-100)] * 0.20 = 90 * 0.20 = 18
    assert.ok(Math.abs(result.buErTco2e - 18) < 1e-9, `Bu_ER,t* = ${result.buErTco2e}, expected 18`);
});

test('Eq (44) reversed changes produce negative buffer (review case)', () => {
    const contract = {
        id: 'vm0010-vcus-neg-buffer-review',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        dcNetPrj: -100,
        cNetBsl: -10,
        nprPct: 0.20,
        crTco2e: 0,
        erTco2e: 52.8,
    };
    const result = runExpression(vcusExpression(), { documents: [asDocument(contract)] });
    // [MIN(0,-100) - MIN(0,-10)] * 0.20 = [-100 - (-10)] * 0.20 = -90 * 0.20 = -18
    assert.ok(Math.abs(result.buErTco2e - (-18)) < 1e-9, `Bu_ER,t* = ${result.buErTco2e}, expected -18`);
});

test('Eq (45) removals VCUs match independent hand-computation', () => {
    const contract = createValidVcusContract();
    const result = runExpression(vcusExpression(), { documents: [asDocument(contract)] });
    // VCU_CR,t* = 64 - 16 = 48
    assert.ok(Math.abs(result.vcuCrTco2e - 48) < 1e-9, `VCU_CR,t* = ${result.vcuCrTco2e}, expected 48`);
});

test('Eq (46) reductions VCUs match independent hand-computation', () => {
    const contract = {
        id: 'vm0010-vcus-reductions-vcu',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        dcNetPrj: -10,
        cNetBsl: -100,
        nprPct: 0.20,
        crTco2e: 64,
        erTco2e: 52.8,
    };
    const result = runExpression(vcusExpression(), { documents: [asDocument(contract)] });
    // VCU_ER,t* = 52.8 - 18 = 34.8 (Bu_ER = [MIN(0,-10) - MIN(0,-100)] * 0.20 = 18)
    assert.ok(Math.abs(result.vcuErTco2e - 34.8) < 1e-9, `VCU_ER,t* = ${result.vcuErTco2e}, expected 34.8`);
});

test('Eq (43) rejects missing DC_NET_PRJ', () => {
    const contract = createValidVcusContract();
    delete contract.dcNetPrj;
    assert.throws(
        () => runExpression(vcusExpression(), { documents: [asDocument(contract)] }),
        /DC_NET_PRJ must be a finite number/,
    );
});

test('Eq (43) rejects missing C_NET_BSL_t', () => {
    const contract = createValidVcusContract();
    delete contract.cNetBsl;
    assert.throws(
        () => runExpression(vcusExpression(), { documents: [asDocument(contract)] }),
        /C_NET_BSL_t must be a finite number/,
    );
});

test('Eq (43) rejects invalid NPR_PCT above 1', () => {
    const contract = createValidVcusContract();
    contract.nprPct = 1.5;
    assert.throws(
        () => runExpression(vcusExpression(), { documents: [asDocument(contract)] }),
        /NPR_PCT must be in \[0,1\]/,
    );
});

test('Eq (43) rejects invalid NPR_PCT below 0', () => {
    const contract = createValidVcusContract();
    contract.nprPct = -0.1;
    assert.throws(
        () => runExpression(vcusExpression(), { documents: [asDocument(contract)] }),
        /NPR_PCT must be in \[0,1\]/,
    );
});

test('Eq (45) rejects missing CR_TCO2E', () => {
    const contract = createValidVcusContract();
    delete contract.crTco2e;
    assert.throws(
        () => runExpression(vcusExpression(), { documents: [asDocument(contract)] }),
        /CR_TCO2E must be a finite number/,
    );
});

test('Eq (46) rejects missing ER_TCO2E', () => {
    const contract = createValidVcusContract();
    delete contract.erTco2e;
    assert.throws(
        () => runExpression(vcusExpression(), { documents: [asDocument(contract)] }),
        /ER_TCO2E must be a finite number/,
    );
});

test('output satisfies schema requirements', () => {
    const result = runExpression(vcusExpression(), { documents: [asDocument(createValidVcusContract())] });
    for (const key of ['ref', 'year', 'buCrTco2e', 'buErTco2e', 'vcuCrTco2e', 'vcuErTco2e']) {
        assert.ok(key in result, `output missing ${key}`);
    }
});

test('Eq (43) does not apply LF or U a second time to buffer', () => {
    const contract = createValidVcusContract();
    const result = runExpression(vcusExpression(), { documents: [asDocument(contract)] });
    // Buffer is pure arithmetic: [MAX(0,100) - MAX(0,20)] * 0.20 = 16; no LF/U multiplier
    assert.ok(Math.abs(result.buCrTco2e - 16) < 1e-9, `Bu_CR,t* = ${result.buCrTco2e}, expected 16`);
});

test('Eq (44) does not apply LF or U a second time to buffer', () => {
    const contract = {
        id: 'vm0010-vcus-no-multiplier-er',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        dcNetPrj: -10,
        cNetBsl: -100,
        nprPct: 0.20,
        crTco2e: 0,
        erTco2e: 52.8,
    };
    const result = runExpression(vcusExpression(), { documents: [asDocument(contract)] });
    // Buffer is pure arithmetic: [MIN(0,-10) - MIN(0,-100)] * 0.20 = 18; no LF/U multiplier
    assert.ok(Math.abs(result.buErTco2e - 18) < 1e-9, `Bu_ER,t* = ${result.buErTco2e}, expected 18`);
});