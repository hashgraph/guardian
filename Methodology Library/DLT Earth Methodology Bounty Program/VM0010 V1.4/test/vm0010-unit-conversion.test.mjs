/**
 * Focused tests for VM0010 v1.4 Task 1 (T01):
 * new typed/provenance input contracts for units, gas, scope, period, record keys and evidence.
 *
 * Acceptance criteria per backlog:
 * - Missing/NaN/infinite numbers reject
 * - explicit percent conversion
 * - required divisors positive
 * - no implicit source or climate constant
 * - existing schemas/tests unchanged unless a separately reviewed compatibility extension is required
 *
 * These tests validate the contract structure and basic data integrity, not methodology
 * interpretation or calculation validity.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SLICE_DIR, runExpression, asDocument } from './_artifact.mjs';

function unitConversionExpression() {
    return readFileSync(join(SLICE_DIR, 'logic', 'vm0010-unit-conversion.js'), 'utf8');
}

function createValidUnitConversionContract() {
    return {
        ref: 'test-project-123',
        monitoringYear: 2026,
        carbonToCo2Conversion: {
            factor: 44 / 12,
            unitFrom: 'tC',
            unitTo: 'tCO2e'
        },
        gasParameters: {
            gwpCH4: 20,
            gwpN2O: 100,
            ch4EmissionFactor: {
                value: 0.01,
                unit: 'g/kg',
                source: 'IPCC 2006'
            },
            n2oEmissionFactor: {
                value: 0.001,
                unit: 'g/kg',
                source: 'IPCC 2006'
            }
        },
        scope: {
            baselineScenario: 'BSL',
            projectScenario: 'PRJ',
            exclusive: ['A', 'B', 'C']
        },
        period: {
            startYear: 2020,
            endYear: 2025,
            durationYears: 6,
            units: 'years'
        },
        recordKeys: {
            projectId: 'test-project-123',
            sliceId: 'VM0010_V1_4_SLICE',
            methodologyVersion: 'v1.4',
            validationHash: 'a' + '0'.repeat(63),
            evidenceFiles: [
                {
                    filename: 'vm0010-v1.4.pdf',
                    sha256: 'a' + '0'.repeat(63),
                    url: 'https://verra.org/wp-content/uploads/2024/10/VM0010_IFM_LtPF_v1.4_Clean_10282024.pdf',
                    description: 'VM0010 v1.4 full methodology PDF'
                }
            ]
        }
    };
}

function createTestContract(contractOverrides) {
    return {
        ...createValidUnitConversionContract(),
        ...contractOverrides
    };
}

test('valid unit conversion contract passes validation', () => {
    const result = runExpression(unitConversionExpression(), {
        documents: [asDocument(createValidUnitConversionContract())]
    });

    assert.equal(result.ref, 'test-project-123');
    assert.equal(result.monitoringYear, 2026);
    assert.ok(Math.abs(result.carbonToCo2Conversion.factor - 44 / 12) < 1e-12);
    assert.equal(result.carbonToCo2Conversion.unitFrom, 'tC');
    assert.equal(result.carbonToCo2Conversion.unitTo, 'tCO2e');
    assert.equal(result.gasParameters.gwpCH4, 20);
    assert.equal(result.gasParameters.gwpN2O, 100);
    assert.equal(result.scope.baselineScenario, 'BSL');
    assert.equal(result.scope.projectScenario, 'PRJ');
    assert.deepEqual(result.scope.exclusive, ['A', 'B', 'C']);
    assert.equal(result.period.startYear, 2020);
    assert.equal(result.period.endYear, 2025);
    assert.equal(result.period.durationYears, 6);
    assert.equal(result.period.units, 'years');
    assert.equal(result.recordKeys.projectId, 'test-project-123');
    assert.equal(result.recordKeys.sliceId, 'VM0010_V1_4_SLICE');
    assert.equal(result.recordKeys.methodologyVersion, 'v1.4');
    assert.equal(result.validationStatus, 'contract_valid');
    assert.ok(result.validatedAt);
});

test('missing required fields are rejected', () => {
    const contract = createTestContract({
        ref: undefined // Remove required field
    });

    assert.throws(
        () => runExpression(unitConversionExpression(), { documents: [asDocument(contract)] }),
        /Missing required field: ref/,
        'should reject contract missing "ref" field'
    );
});

test('monitoringYear NaN is rejected', () => {
    const contract = createTestContract({
        monitoringYear: NaN
    });

    assert.throws(
        () => runExpression(unitConversionExpression(), { documents: [asDocument(contract)] }),
        /must be a valid finite number/,
        'should reject NaN monitoringYear'
    );
});

test('monitoringYear outside valid range is rejected', () => {
    for (const badYear of [1899, 2201]) {
        const contract = createTestContract({
            monitoringYear: badYear
        });

        assert.throws(
            () => runExpression(unitConversionExpression(), { documents: [asDocument(contract)] }),
            /is outside valid range 1900-2200/,
            `should reject monitoringYear ${badYear}`
        );
    }
});
test('carbonToCo2Conversion factor NaN is rejected', () => {
    const contract = createTestContract({
        carbonToCo2Conversion: {
            factor: NaN,
            unitFrom: 'tC',
            unitTo: 'tCO2e'
        }
    });

    assert.throws(
        () => runExpression(unitConversionExpression(), { documents: [asDocument(contract)] }),
        /must be a valid finite number/,
        'should reject NaN factor'
    );
});

test('carbonToCo2Conversion factor negative is rejected', () => {
    const contract = createTestContract({
        carbonToCo2Conversion: {
            factor: -1,
            unitFrom: 'tC',
            unitTo: 'tCO2e'
        }
    });

    assert.throws(
        () => runExpression(unitConversionExpression(), { documents: [asDocument(contract)] }),
        /must be positive/,
        'should reject negative factor'
    );
});

test('carbonToCo2Conversion unitFrom must be tC', () => {
    const contract = createTestContract({
        carbonToCo2Conversion: {
            factor: 44 / 12,
            unitFrom: 'wrong',
            unitTo: 'tCO2e'
        }
    });

    assert.throws(
        () => runExpression(unitConversionExpression(), { documents: [asDocument(contract)] }),
        /must be "tC"/,
        'should reject wrong unitFrom'
    );
});
test('emission factor value must be positive', () => {
    const contract = createTestContract({
        gasParameters: {
            gwpCH4: 20,
            gwpN2O: 100,
            ch4EmissionFactor: {
                value: -0.01,
                unit: 'g/kg',
                source: 'IPCC 2006'
            },
            n2oEmissionFactor: {
                value: 0.001,
                unit: 'g/kg',
                source: 'IPCC 2006'
            }
        }
    });

    assert.throws(
        () => runExpression(unitConversionExpression(), { documents: [asDocument(contract)] }),
        /value must be positive/,
        'should reject negative emission factor value'
    );
});

test('period units must be valid', () => {
    const contract = createTestContract({
        period: {
            startYear: 2020,
            endYear: 2025,
            durationYears: 6,
            units: 'invalid'
        }
    });

    assert.throws(
        () => runExpression(unitConversionExpression(), { documents: [asDocument(contract)] }),
        /must be "years", "quarters", or "months"/,
        'should reject invalid period units'
    );
});