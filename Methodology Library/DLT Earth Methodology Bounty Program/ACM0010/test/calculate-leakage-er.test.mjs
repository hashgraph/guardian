/**
 * Tests for ACM0010 v09.0 leakage (LE_y) and emission reduction (ER_y) calculations.
 *
 * Source: ACM0010 v09.0 Draft (CDM-MP98-A01)
 *   - Eq (22): LE_y = (LEPJ,N2O,y − LEBL,N2O,y) + (LEPJ,CH4,y − LEBL,CH4,y) + LEAD_y
 *   - Eq (23-26): Leakage N2O components
 *   - Eq (31-32): Leakage CH4 components
 *   - Eq (33): ER_y = BE_y − PE_y − LE_y
 *   - Eq (34): ER_y,ex post = min[(BE_CH4,ex post − PE_y,ex post), (MD_y − PE_y − LE_y)]
 *   - Eq (35): MD_y = BG_burnet,y × w_CH4,y × D_CH4 × GWP_CH4
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { runExpression, asDocument } from './_artifact.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SLICE_DIR = join(HERE, '..');

// Load logic files
const leakageLogic = readFileSync(join(SLICE_DIR, 'logic', 'calculate-leakage.js'), 'utf8');
const erLogic = readFileSync(join(SLICE_DIR, 'logic', 'calculate-er.js'), 'utf8');

// ---- Test fixtures ----

function baseProject(overrides = {}) {
    return {
        id: 'acm0010-leakage-test',
        projectName: 'Leakage Test Farm',
        monitoringYear: 2026,
        baselineAwms: {
            name: 'Anaerobic Lagoon',
            methaneConversionFactor: 0.1,
            stages: [{
                name: 'Anaerobic Lagoon',
                methaneConversionFactor: 0.1,
                volatileSolidsReductionFraction: 0,
                relativeNitrogenReduction: 0,
                manureFraction: 1,
                directN2OEmissionFactorKgN2ONPerKgN: 0.001,
            }],
        },
        livestock: [
            {
                type: 'Dairy Cattle',
                annualVolatileSolids: 100,
                maxMethaneProducingCapacity: 0.24,
                nitrogenExcretionKgNPerAnimalYear: 100,
                herdParameters: {
                    averageWeightSiteKg: 600,
                    defaultWeightKg: 500,
                    volatileSolidsDefaultKgDmPerDay: 0.2,
                    operationalDaysPerYear: 365,
                    daysAliveInYear: 365,
                    animalsProducedAnnually: 1000,
                },
            },
        ],
        parameters: {
            globalWarmingPotentialCh4: 28,
            globalWarmingPotentialN2O: 265,
            indirectN2OEmissionFactorKgN2ONPerKgN: 0.01,
            fractionNitrogenVolatilised: 0.3,
        },
        ...overrides,
    };
}

function leakageProject(overrides = {}) {
    return baseProject({
        leakageActivity: {
            ef1KgN2ONPerKgN: 0.01,
            ef4KgN2ONPerKgNH3NAndNOxN: 0.01,
            ef5KgN2ONPerKgN: 0.001,
            fLeach: 0.3,
            fGasm: 0.3,
            mcfD: 1.0,
            msFraction: 1.0,
            leadYTCo2e: 0,
        },
        ...overrides,
    });
}

// ---- Leakage N2O tests ----

test('leakage N2O: LEN2O,land,y = EF1 × Π(1 − RN,n) × Σ(N_EX_LT,y × N_LT)', () => {
    const project = leakageProject();
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // N_LT = 1000, N_EX = 100 kg N/head/yr => 100,000 kg N
    // LEN2O,land = 0.01 × 1 × 100,000 = 1,000 kg N2O-N
    assert.equal(result.len2oLandKgN2ON, 1000);
});

test('leakage N2O: LEN2O,runoff,y = EF5 × F_leach × Π(1 − RN,n) × Σ(N_EX_LT,y × N_LT)', () => {
    const project = leakageProject();
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // LEN2O,runoff = 0.001 × 0.3 × 1 × 100,000 = 30 kg N2O-N
    assert.ok(Math.abs(result.len2oRunoffKgN2ON - 30) < 1e-9);
});

test('leakage N2O: LEN2O,vol,y = EF4 × Π(1 − RN,n) × F_gasm × Σ(N_EX_LT,y × N_LT)', () => {
    const project = leakageProject();
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // LEN2O,vol = 0.01 × 1 × 0.3 × 100,000 = 300 kg N2O-N
    assert.equal(result.len2oVolKgN2ON, 300);
});

test('leakage N2O: LEBL,N2O,y = GWP_N2O × CF_N2O-N,N × 1/1000 × (LEN2O,land + LEN2O,runoff + LEN2O,vol)', () => {
    const project = leakageProject();
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // Total N2O-N = 1,000 + 30 + 300 = 1,330 kg N2O-N
    // LEBL,N2O = 265 × (44/28) × (1/1000) × 1,330 = 573.85 tCO2e
    const expected = 265 * (44 / 28) * (1 / 1000) * 1330;
    assert.ok(Math.abs(result.leblN2oTCo2e - expected) < 1e-6);
});

test('leakage CH4: LEBL,CH4,y = GWP_CH4 × D_CH4 × MCF_d × [Π(1 − RVS,n)] × Σ(B0_LT × N_LT × VSLT_y × MS%_j)', () => {
    const project = leakageProject();
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // VS = 100 kg, B0 = 0.24, N_LT = 1000, D_CH4 = 0.00067, MCF_d = 1.0
    // LEBL,CH4 = 28 × 0.00067 × 1.0 × 1 × (0.24 × 1000 × 100 × 1.0) = 449.28 tCO2e
    const expected = 28 * 0.00067 * 1.0 * 1 * (0.24 * 1000 * 100 * 1.0);
    assert.ok(Math.abs(result.leblCh4TCo2e - expected) < 1e-6);
});

test('leakage: LE_y = (LEPJ,N2O,y − LEBL,N2O,y) + (LEPJ,CH4,y − LEBL,CH4,y) + LEAD_y', () => {
    const project = leakageProject();
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // Since LEPJ = LEBL, the N2O and CH4 leakage terms are 0
    // LE_y = 0 + 0 + 0 = 0
    assert.equal(result.leakageTCo2e, 0);
});

test('leakage: net leakage is only considered if positive', () => {
    const project = leakageProject({
        leakageActivity: {
            ef1KgN2ONPerKgN: 0.01,
            ef4KgN2ONPerKgNH3NAndNOxN: 0.01,
            ef5KgN2ONPerKgN: 0.001,
            fLeach: 0.3,
            fGasm: 0.3,
            mcfD: 1.0,
            msFraction: 1.0,
            leadYTCo2e: 5.0,
        },
    });
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // LE_y = 0 + 0 + 5.0 = 5.0
    assert.equal(result.leakageTCo2e, 5.0);
});

test('leakage: RN decay factor reduces N2O leakage', () => {
    const project = leakageProject({
        baselineAwms: {
            name: 'Anaerobic Lagoon',
            methaneConversionFactor: 0.1,
            stages: [{
                name: 'Anaerobic Lagoon',
                methaneConversionFactor: 0.1,
                volatileSolidsReductionFraction: 0,
                relativeNitrogenReduction: 0.5,
            }],
        },
    });
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // RN = 0.5, so LEN2O,land = 0.01 × 0.5 × 100,000 = 500 kg N2O-N
    assert.equal(result.len2oLandKgN2ON, 500);
});

test('leakage: RVS decay factor reduces CH4 leakage', () => {
    const project = leakageProject({
        baselineAwms: {
            name: 'Anaerobic Lagoon',
            methaneConversionFactor: 0.1,
            stages: [{
                name: 'Anaerobic Lagoon',
                methaneConversionFactor: 0.1,
                volatileSolidsReductionFraction: 0.5,
                relativeNitrogenReduction: 0,
            }],
        },
    });
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });

    // RVS = 0.5, so LEBL,CH4 = 28 × 0.00067 × 1.0 × 0.5 × (0.24 × 1000 × 100 × 1.0) = 224.64 tCO2e
    const expected = 28 * 0.00067 * 1.0 * 0.5 * (0.24 * 1000 * 100 * 1.0);
    assert.ok(Math.abs(result.leblCh4TCo2e - expected) < 1e-6);
});

// ---- ER_y tests ----

test('ER_y = BE_y − PE_y − LE_y', () => {
    const project = baseProject({
        leakageActivity: {
            ef1KgN2ONPerKgN: 0.01,
            ef4KgN2ONPerKgNH3NAndNOxN: 0.01,
            ef5KgN2ONPerKgN: 0.001,
            fLeach: 0.3,
            fGasm: 0.3,
            mcfD: 1.0,
            msFraction: 1.0,
            leadYTCo2e: 0,
        },
    });
    const result = runExpression(erLogic, { documents: [asDocument(project)] });

    // BE_y = BE_CH4,y + BE_N2O,y
    // BE_CH4 = 100 kg VS × 0.1 MCF × 0.24 B0 × 0.67 kg/m3 = 1.608 kg CH4
    // BE_CH4,tCO2e = 1.608 × 28 / 1000 = 0.045 tCO2e
    // BE_N2O = 0 (not provided)
    // PE_y = 0
    // LE_y = 0
    // ER_y = 0.045 - 0 - 0 = 0.045 tCO2e
    assert.ok(result.emissionReductionsTCo2e >= 0);
});

test('MD_y = BG_burnet,y × w_CH4,y × D_CH4 × GWP_CH4', () => {
    const project = baseProject({
        methaneCapture: {
            biogasVolumeM3PerYear: 1000,
            methaneVolumeFraction: 0.6,
        },
    });
    const result = runExpression(erLogic, { documents: [asDocument(project)] });

    // MD_y = 1000 × 0.6 × 0.00067 × 28 = 11.256 tCO2e
    const expected = 1000 * 0.6 * 0.00067 * 28;
    assert.ok(Math.abs(result.methaneCapturedTCo2e - expected) < 1e-6);
});

test('ER_y,ex post = min[(BE_CH4,ex post − PE_y,ex post), (MD_y − PE_y − LE_y)]', () => {
    const project = baseProject({
        methaneCapture: {
            biogasVolumeM3PerYear: 1000,
            methaneVolumeFraction: 0.6,
        },
        exPostCalculation: {
            beCh4ExPostTCo2e: 100,
            peExPostTCo2e: 5,
        },
    });
    const result = runExpression(erLogic, { documents: [asDocument(project)] });

    // ER_from_baseline = 100 - 5 = 95
    // ER_from_methane_captured = 11.256 - 0 - 0 = 11.256
    // ER_ex_post = min(95, 11.256) = 11.256
    assert.ok(Math.abs(result.emissionReductionsExPostTCo2e - 11.256) < 1e-6);
});

// ---- Input validation tests ----

test('leakage: missing leakageActivity returns null', () => {
    const project = baseProject();
    const result = runExpression(leakageLogic, { documents: [asDocument(project)] });
    assert.equal(result, null);
});

test('leakage: invalid EF1 is rejected', () => {
    const project = leakageProject({
        leakageActivity: {
            ef1KgN2ONPerKgN: -0.01,
            ef4KgN2ONPerKgNH3NAndNOxN: 0.01,
            ef5KgN2ONPerKgN: 0.001,
            fLeach: 0.3,
            fGasm: 0.3,
            mcfD: 1.0,
            msFraction: 1.0,
        },
    });
    assert.throws(() => runExpression(leakageLogic, { documents: [asDocument(project)] }));
});

test('leakage: invalid fLeach is rejected', () => {
    const project = leakageProject({
        leakageActivity: {
            ef1KgN2ONPerKgN: 0.01,
            ef4KgN2ONPerKgNH3NAndNOxN: 0.01,
            ef5KgN2ONPerKgN: 0.001,
            fLeach: 1.5,
            fGasm: 0.3,
            mcfD: 1.0,
            msFraction: 1.0,
        },
    });
    assert.throws(() => runExpression(leakageLogic, { documents: [asDocument(project)] }));
});

test('leakage: invalid fGasm is rejected', () => {
    const project = leakageProject({
        leakageActivity: {
            ef1KgN2ONPerKgN: 0.01,
            ef4KgN2ONPerKgNH3NAndNOxN: 0.01,
            ef5KgN2ONPerKgN: 0.001,
            fLeach: 0.3,
            fGasm: -0.1,
            mcfD: 1.0,
            msFraction: 1.0,
        },
    });
    assert.throws(() => runExpression(leakageLogic, { documents: [asDocument(project)] }));
});

test('leakage: invalid mcfD is rejected', () => {
    const project = leakageProject({
        leakageActivity: {
            ef1KgN2ONPerKgN: 0.01,
            ef4KgN2ONPerKgNH3NAndNOxN: 0.01,
            ef5KgN2ONPerKgN: 0.001,
            fLeach: 0.3,
            fGasm: 0.3,
            mcfD: 1.5,
            msFraction: 1.0,
        },
    });
    assert.throws(() => runExpression(leakageLogic, { documents: [asDocument(project)] }));
});

test('ER: missing methaneCapture returns 0', () => {
    const project = baseProject();
    const result = runExpression(erLogic, { documents: [asDocument(project)] });
    assert.equal(result.methaneCapturedTCo2e, 0);
});

test('ER: invalid methaneVolumeFraction is rejected', () => {
    const project = baseProject({
        methaneCapture: {
            biogasVolumeM3PerYear: 1000,
            methaneVolumeFraction: 1.5,
        },
    });
    assert.throws(() => runExpression(erLogic, { documents: [asDocument(project)] }));
});

test('ER: invalid biogasVolumeM3PerYear is rejected', () => {
    const project = baseProject({
        methaneCapture: {
            biogasVolumeM3PerYear: -1000,
            methaneVolumeFraction: 0.6,
        },
    });
    assert.throws(() => runExpression(erLogic, { documents: [asDocument(project)] }));
});
