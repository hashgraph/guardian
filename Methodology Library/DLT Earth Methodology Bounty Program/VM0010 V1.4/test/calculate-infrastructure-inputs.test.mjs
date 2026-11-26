/**
 * Focused tests for VM0010 v1.4 - Equation A01 Infrastructure Volume Partition
 *
 *   V_EX,INF  = F_V,INF,HWP * V_cleared
 *   V_notEX,INF = (1 - F_V,INF,HWP) * V_cleared
 *
 * C&C status: The mandatory 2026 documents do not amend the infrastructure
 * volume partition (Section 9.1 Data / Parameter, pp. 54-55) or the BEF-density
 * relation (A02).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function infraInputsExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'calculate-infrastructure-inputs.js'), 'utf8');
}

function createValidInfrastructureContract() {
    return {
        id: 'vm0010-a01-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        infrastructureClearedVolumes: [
            { species: 1, stratum: 1, vCleared: 100, vInfHwp: 0.6 }
        ],
        strata: [],
        infrastructureBiomass: [],
        residualStandDamage: [],
        woodProducts: [],
        deadWood: []
    };
}

test('A01 partition with F=0.6 and cleared volume 100 gives 60 and 40', () => {
    const result = runExpression(infraInputsExpression(), { documents: [asDocument(createValidInfrastructureContract())] });
    assert.equal(result.rows.length, 1);

    const row = result.rows[0];
    assert.equal(row.vCleared, 100);
    assert.equal(row.vInfHwp, 0.6);
    assert.equal(row.vExInfJiBsl, 60); // V_EX,INF = 0.6 * 100
    assert.equal(row.vNotExInfJiBsl, 40); // V_notEX,INF = 0.4 * 100
});

test('A01 partition with F=1 gives full cleared volume as infrastructure', () => {
    const contract = createValidInfrastructureContract();
    contract.infrastructureClearedVolumes = [{ species: 1, stratum: 1, vCleared: 100, vInfHwp: 1 }];
    const result = runExpression(infraInputsExpression(), { documents: [asDocument(contract)] });
    assert.equal(result.rows[0].vExInfJiBsl, 100);
    assert.equal(result.rows[0].vNotExInfJiBsl, 0);
});

test('A01 partition with F=0 gives full cleared volume as not-extracted', () => {
    const contract = createValidInfrastructureContract();
    contract.infrastructureClearedVolumes = [{ species: 1, stratum: 1, vCleared: 100, vInfHwp: 0 }];
    const result = runExpression(infraInputsExpression(), { documents: [asDocument(contract)] });
    assert.equal(result.rows[0].vExInfJiBsl, 0);
    assert.equal(result.rows[0].vNotExInfJiBsl, 100);
});

test('A01 rejects F outside [0,1]', () => {
    const contract = createValidInfrastructureContract();
    contract.infrastructureClearedVolumes = [{ species: 1, stratum: 1, vCleared: 100, vInfHwp: 1.5 }];
    assert.throws(
        () => runExpression(infraInputsExpression(), { documents: [asDocument(contract)] }),
        /F_V,INF,HWP must be in \[0,1\]/,
    );
});

test('A01 rejects missing cleared volume', () => {
    const contract = createValidInfrastructureContract();
    contract.infrastructureClearedVolumes = [{ species: 1, stratum: 1, vInfHwp: 0.6 }];
    assert.throws(
        () => runExpression(infraInputsExpression(), { documents: [asDocument(contract)] }),
        /V_cleared must be a finite number/,
    );
});

test('A01 requires at least one species/stratum combination', () => {
    const contract = createValidInfrastructureContract();
    contract.infrastructureClearedVolumes = [];
    assert.throws(
        () => runExpression(infraInputsExpression(), { documents: [asDocument(contract)] }),
        /at least one species\/stratum combination is required/,
    );
});
