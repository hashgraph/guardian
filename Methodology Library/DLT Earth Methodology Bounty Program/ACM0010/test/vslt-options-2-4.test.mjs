/**
 * ACM0010 v09.0 VSLT Options 2 (Eq 3) and 4 (Eq 5) - independent numerical tests.
 * Source: ACM0010_v09_draft.pdf pp.14-15 (CDM-MP98-A01).
 *   Eq (3): VSLT,y = [GE_LT*(1 - DE_LT/100) + (UE*GE_LT)] * [(1 - ASH)/ED_LT] * nd_y
 *   Eq (5): VSLT,y = VSrate,LT,y/1000 * W_LT,y * nd_y
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();
function calcExpression() {
    let found = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock' && n.tag === 'acm0010_calculate_baseline_ch4') found = n.expression;
    });
    assert.ok(found, 'calc expression missing');
    return found;
}
const D_CH4_KG_PER_M3 = 0.00067 * 1000; // kg/m3
function base(livestock, overrides = {}) {
    return {
        id: 'vslt-test', projectName: 'VSLT', monitoringYear: 2026,
        baselineAwms: { name: 'Lagoon', methaneConversionFactor: 0.5 },
        livestock,
        parameters: { globalWarmingPotentialCh4: 25 },
        ...overrides,
    };
}

test('VSLT Option 4 Eq (5): VSrate/1000 * W * ndy * N_LT', () => {
    // VSrate=5 kgVS/1000kg-day, W=500kg, ndy=365 => 912.5 kg dm/animal/yr; N_LT=100 => 91250
    const pd = base([{
        type: 'Cattle', maxMethaneProducingCapacity: 0.2,
        vsltAnnualAverageAnimals: 100,
        vsltOption4: { vsRateKgPer1000KgAnimalMassPerDay: 5, averageAnimalWeightKg: 500, operationalDaysPerYear: 365 }
    }]);
    const r = runExpression(calcExpression(), { documents: [asDocument(pd)] });
    const vslt = (5 / 1000) * 500 * 365;
    const annualVs = 100 * vslt;
    assert.ok(Math.abs(r.volatileSolidsDerivation[0].volatileSolidsPerAnimalKgDm - vslt) < 1e-12);
    assert.ok(Math.abs(r.volatileSolidsDerivation[0].annualVolatileSolidsKgDm - annualVs) < 1e-9);
    assert.equal(r.volatileSolidsDerivation[0].source, 'vsltOption4_eq5');
    const expectedKg = annualVs * 0.5 * 0.2 * D_CH4_KG_PER_M3;
    assert.ok(Math.abs(r.baselineMethaneEmissionsKgCh4 - expectedKg) < 1e-9);
});

test('VSLT Option 4 Eq (5): N_LT derived from herdParameters when vsltAnnualAverageAnimals omitted', () => {
    const pd = base([{
        type: 'Cattle', maxMethaneProducingCapacity: 0.2,
        herdParameters: { averageWeightSiteKg: 500, defaultWeightKg: 500, volatileSolidsDefaultKgDmPerDay: 0, operationalDaysPerYear: 365, daysAliveInYear: 365, animalsProducedAnnually: 1000 },
        vsltOption4: { vsRateKgPer1000KgAnimalMassPerDay: 5, averageAnimalWeightKg: 500, operationalDaysPerYear: 365 }
    }]);
    const r = runExpression(calcExpression(), { documents: [asDocument(pd)] });
    const nlt = 365 * (1000 / 365);
    assert.ok(Math.abs(r.volatileSolidsDerivation[0].annualAverageAnimals - nlt) < 1e-12);
    assert.ok(Math.abs(r.volatileSolidsDerivation[0].annualVolatileSolidsKgDm - nlt * (5 / 1000) * 500 * 365) < 1e-9);
});

test('VSLT Option 2 Eq (3): dietary intake formula', () => {
    // [GE*(1-DE/100)+(UE*GE)] * [(1-ASH)/ED] * ndy
    const ge = 20, de = 60, ue = 0.04, ash = 0.08, ed = 18.45, ndy = 365, nlt = 50;
    const pd = base([{
        type: 'Cattle', maxMethaneProducingCapacity: 0.24,
        vsltAnnualAverageAnimals: nlt,
        vsltOption2: {
            dailyAverageGrossEnergyIntakeMjPerAnimalDay: ge,
            digestibleEnergyPercent: de,
            urinaryEnergyFractionOfGe: ue,
            ashContentFractionOfDryMatterFeedIntake: ash,
            energyDensityOfFeedMjPerKgDm: ed,
            operationalDaysPerYear: ndy
        }
    }]);
    const r = runExpression(calcExpression(), { documents: [asDocument(pd)] });
    const vslt = (ge * (1 - de / 100) + (ue * ge)) * ((1 - ash) / ed) * ndy;
    assert.ok(Math.abs(r.volatileSolidsDerivation[0].volatileSolidsPerAnimalKgDm - vslt) < 1e-12);
    assert.ok(Math.abs(r.volatileSolidsDerivation[0].annualVolatileSolidsKgDm - nlt * vslt) < 1e-9);
    assert.equal(r.volatileSolidsDerivation[0].source, 'vsltOption2_eq3');
});

test('VSLT Option 2 Eq (3): boundary/validation', () => {
    const good = { dailyAverageGrossEnergyIntakeMjPerAnimalDay: 10, digestibleEnergyPercent: 50, urinaryEnergyFractionOfGe: 0.04, ashContentFractionOfDryMatterFeedIntake: 0.1, energyDensityOfFeedMjPerKgDm: 18, operationalDaysPerYear: 365 };
    assert.throws(() => runExpression(calcExpression(), { documents: [asDocument(base([{ type: 'C', maxMethaneProducingCapacity: 0.2, vsltAnnualAverageAnimals: 1, vsltOption2: { ...good, digestibleEnergyPercent: 101 } }]))] }));
    assert.throws(() => runExpression(calcExpression(), { documents: [asDocument(base([{ type: 'C', maxMethaneProducingCapacity: 0.2, vsltAnnualAverageAnimals: 1, vsltOption2: { ...good, energyDensityOfFeedMjPerKgDm: 0 } }]))] }));
    assert.throws(() => runExpression(calcExpression(), { documents: [asDocument(base([{ type: 'C', maxMethaneProducingCapacity: 0.2, vsltAnnualAverageAnimals: 1, vsltOption2: { ...good, ashContentFractionOfDryMatterFeedIntake: 1 } }]))] }));
});

test('VSLT options require N_LT source', () => {
    assert.throws(() => runExpression(calcExpression(), { documents: [asDocument(base([{ type: 'C', maxMethaneProducingCapacity: 0.2, vsltOption4: { vsRateKgPer1000KgAnimalMassPerDay: 5, averageAnimalWeightKg: 500, operationalDaysPerYear: 365 } }]))] }), /vsltAnnualAverageAnimals|herdParameters/);
});

test('direct annualVolatileSolids still takes precedence (regression)', () => {
    const pd = base([{ type: 'C', annualVolatileSolids: 1000, maxMethaneProducingCapacity: 0.2, vsltOption4: { vsRateKgPer1000KgAnimalMassPerDay: 5, averageAnimalWeightKg: 500, operationalDaysPerYear: 365 }, vsltAnnualAverageAnimals: 100 }]);
    const r = runExpression(calcExpression(), { documents: [asDocument(pd)] });
    assert.equal(r.volatileSolidsDerivation[0].source, 'supplied');
    assert.equal(r.volatileSolidsDerivation[0].annualVolatileSolidsKgDm, 1000);
});
