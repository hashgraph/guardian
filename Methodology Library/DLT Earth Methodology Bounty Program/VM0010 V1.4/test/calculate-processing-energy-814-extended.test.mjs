/**
 * Tests for VM0010 v1.4 Equations (18)-(21) - Grid and Generator Processing Emissions
 *
 * Source: VM0010 v1.4, Section 8.1.4 pp. 31-33
 *   - Eq (18): Q_PROCESSING = SUM_{j,i}(V_EX,j,i|BSL * A_i) * E_DEMAND; kWh
 *   - Eq (19): E_PROCESSING = Q_PROCESSING * EF_ELECTRICITY; tCO2e (grid branch)
 *   - Eq (20): PR_GENERATOR = Q_PROCESSING / T_GENERATOR; kW (generator branch)
 *   - Eq (21): E_PROCESSING = FC_GENERATOR * T_GENERATOR * EF_FUEL; tCO2e (generator branch)
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

// Load logic file
const processingLogic = readFileSync(join(SLICE_DIR, 'logic', 'calculate-processing-energy-814.js'), 'utf8');

// ---- Test fixtures ----

function baseProject(overrides = {}) {
    return {
        id: 'vm0010-processing-test',
        projectName: 'Processing Energy Test',
        monitoringYear: 2026,
        strata: [
            { species: 1, stratum: 1, treeVolumes: [10, 20, 30] },
        ],
        plotAreas: [
            { species: 1, stratum: 1, area: 10 },
        ],
        eDemand: 30,
        fcHarvest: 0.00128,
        efFuel: 2.5,
        energySource: 'grid',
        efElectricity: 0.0005,
        ...overrides,
    };
}

// ---- Eq (18): Q_PROCESSING tests ----

test('Eq (18): Q_PROCESSING = SUM(V_EX * A_i) * E_DEMAND', () => {
    const project = baseProject();
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    // Total volume = 10 + 20 + 30 = 60 m3
    // Total volume-area product = 60 * 10 = 600 m3*ha
    // Q_PROCESSING = 600 * 30 = 18,000 kWh
    assert.equal(result.qProcessingKwhEq18, 18000);
});

// ---- Eq (19): Grid processing emissions tests ----

test('Eq (19): E_PROCESSING = Q_PROCESSING * EF_ELECTRICITY (grid branch)', () => {
    const project = baseProject({
        energySource: 'grid',
        efElectricity: 0.0005,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    // Q_PROCESSING = 18,000 kWh
    // E_PROCESSING = 18,000 * 0.0005 = 9 tCO2e
    assert.equal(result.eProcessingGridTco2e, 9);
});

test('Eq (19): grid branch does not emit generator fields', () => {
    const project = baseProject({
        energySource: 'grid',
        efElectricity: 0.0005,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    assert.equal(result.prGeneratorKw, null);
    assert.equal(result.eProcessingGeneratorTco2e, null);
});

// ---- Eq (20): Generator power tests ----

test('Eq (20): PR_GENERATOR = Q_PROCESSING / T_GENERATOR', () => {
    const project = baseProject({
        energySource: 'generator',
        tGenerator: 100,
        fcGenerator: 0.006,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    // Q_PROCESSING = 18,000 kWh
    // PR_GENERATOR = 18,000 / 100 = 180 kW
    assert.equal(result.prGeneratorKw, 180);
});

// ---- Eq (21): Generator processing emissions tests ----

test('Eq (21): E_PROCESSING = FC_GENERATOR * T_GENERATOR * EF_FUEL', () => {
    const project = baseProject({
        energySource: 'generator',
        tGenerator: 100,
        fcGenerator: 0.006,
        efFuel: 2.5,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    // E_PROCESSING = 0.006 * 100 * 2.5 = 1.5 tCO2e
    assert.equal(result.eProcessingGeneratorTco2e, 1.5);
});

test('Eq (21): generator branch does not emit grid fields', () => {
    const project = baseProject({
        energySource: 'generator',
        tGenerator: 100,
        fcGenerator: 0.006,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    assert.equal(result.eProcessingGridTco2e, null);
});

// ---- Input validation tests ----

test('processing energy: invalid energySource is rejected', () => {
    const project = baseProject({
        energySource: 'invalid',
    });
    assert.throws(() => runExpression(processingLogic, { documents: [asDocument(project)] }));
});

test('processing energy: grid branch requires EF_ELECTRICITY', () => {
    const project = baseProject({
        energySource: 'grid',
        efElectricity: undefined,
    });
    assert.throws(() => runExpression(processingLogic, { documents: [asDocument(project)] }));
});

test('processing energy: grid branch rejects negative EF_ELECTRICITY', () => {
    const project = baseProject({
        energySource: 'grid',
        efElectricity: -0.0005,
    });
    assert.throws(() => runExpression(processingLogic, { documents: [asDocument(project)] }));
});

test('processing energy: generator branch requires T_GENERATOR', () => {
    const project = baseProject({
        energySource: 'generator',
    });
    assert.throws(() => runExpression(processingLogic, { documents: [asDocument(project)] }));
});

test('processing energy: generator branch rejects zero T_GENERATOR', () => {
    const project = baseProject({
        energySource: 'generator',
        tGenerator: 0,
        fcGenerator: 0.006,
    });
    assert.throws(() => runExpression(processingLogic, { documents: [asDocument(project)] }));
});

test('processing energy: generator branch rejects negative T_GENERATOR', () => {
    const project = baseProject({
        energySource: 'generator',
        tGenerator: -100,
        fcGenerator: 0.006,
    });
    assert.throws(() => runExpression(processingLogic, { documents: [asDocument(project)] }));
});

test('processing energy: generator branch requires FC_GENERATOR', () => {
    const project = baseProject({
        energySource: 'generator',
        tGenerator: 100,
    });
    assert.throws(() => runExpression(processingLogic, { documents: [asDocument(project)] }));
});

test('processing energy: generator branch rejects negative FC_GENERATOR', () => {
    const project = baseProject({
        energySource: 'generator',
        tGenerator: 100,
        fcGenerator: -0.006,
    });
    assert.throws(() => runExpression(processingLogic, { documents: [asDocument(project)] }));
});

// ---- Boundary tests ----

test('processing energy: zero E_DEMAND yields zero Q_PROCESSING', () => {
    const project = baseProject({
        eDemand: 0,
        energySource: 'grid',
        efElectricity: 0.0005,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    assert.equal(result.qProcessingKwhEq18, 0);
    assert.equal(result.eProcessingGridTco2e, 0);
});

test('processing energy: zero EF_ELECTRICITY yields zero grid emissions', () => {
    const project = baseProject({
        energySource: 'grid',
        efElectricity: 0,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    assert.equal(result.eProcessingGridTco2e, 0);
});

test('processing energy: zero FC_GENERATOR yields zero generator emissions', () => {
    const project = baseProject({
        energySource: 'generator',
        tGenerator: 100,
        fcGenerator: 0,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    assert.equal(result.eProcessingGeneratorTco2e, 0);
});

// ---- Independent numerical verification ----

test('Eq (19) independent verification: 3000 kWh * 0.0005 = 1.5 tCO2e', () => {
    const project = baseProject({
        strata: [{ species: 1, stratum: 1, treeVolumes: [10] }],
        plotAreas: [{ species: 1, stratum: 1, area: 10 }],
        eDemand: 30,
        energySource: 'grid',
        efElectricity: 0.0005,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    // Total volume = 10 m3
    // Total volume-area product = 10 * 10 = 100 m3*ha
    // Q_PROCESSING = 100 * 30 = 3,000 kWh
    // E_PROCESSING = 3,000 * 0.0005 = 1.5 tCO2e
    assert.equal(result.qProcessingKwhEq18, 3000);
    assert.equal(result.eProcessingGridTco2e, 1.5);
});

test('Eq (20)-(21) independent verification: 2000 kWh / 100 h = 20 kW; 0.006 * 100 * 2.5 = 1.5 tCO2e', () => {
    const project = baseProject({
        strata: [{ species: 1, stratum: 1, treeVolumes: [10] }],
        plotAreas: [{ species: 1, stratum: 1, area: 10 }],
        eDemand: 20,
        energySource: 'generator',
        tGenerator: 100,
        fcGenerator: 0.006,
        efFuel: 2.5,
    });
    const result = runExpression(processingLogic, { documents: [asDocument(project)] });

    // Total volume = 10 m3
    // Total volume-area product = 10 * 10 = 100 m3*ha
    // Q_PROCESSING = 100 * 20 = 2,000 kWh
    // PR_GENERATOR = 2,000 / 100 = 20 kW
    // E_PROCESSING = 0.006 * 100 * 2.5 = 1.5 tCO2e
    assert.equal(result.qProcessingKwhEq18, 2000);
    assert.equal(result.prGeneratorKw, 20);
    assert.equal(result.eProcessingGeneratorTco2e, 1.5);
});
