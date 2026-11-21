/**
 * ACM0010 VSLT Option 3 Eq (4) scaling form - independent tests.
 * Sources:
 * - ACM0010 v03/v04 Option 3 Eq(4): VSLT,y = (Wsite/Wdefault)*VSdefault*ndy (kg-dm/animal/yr).
 * - ACM0010 v09 draft (CDM-MP98-A01, p.14-15) states same intent ("Scaling default 2019 IPCC values
 *   VSdefault to adjust for a site-specific average animal weight...") but Eq(4) layout in extracted
 *   PDF/text is ambiguous (VSdefault and VSrate,LT,y/1000 appear adjacently; exact operator/term
 *   selection not unambiguous). Implementation uses v03/v04-aligned, unit-consistent scaling form and
 *   records provenance; not claimed as final unambiguous v09 Eq(4) rendering without confirmation.
 * - IPCC 2019 Refinement Vol.4 Ch.10 Eq 10.22a / Table 10.13a context: VSrate is kg VS per 1000 kg
 *   animal mass/day (VS = VSrate*TAM/1000*365), distinct from VSdefault (kg-dm/animal/day) in scaling.
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
const D_CH4_KG_PER_M3 = 0.00067 * 1000;
function base(livestock) {
  return {
    id: 'vslt-eq4', projectName: 'VSLT4', monitoringYear: 2026,
    baselineAwms: { name: 'Lagoon', methaneConversionFactor: 0.5 },
    livestock,
    parameters: { globalWarmingPotentialCh4: 25 },
  };
}

test('VSLT Option 3 Eq(4) scaling: (Wsite/Wdefault)*VSdefault*ndy*N_LT', () => {
  const pd = base([{
    type: 'Cattle', maxMethaneProducingCapacity: 0.2,
    vsltAnnualAverageAnimals: 50,
    vsltOption3Eq4Scaling: {
      averageWeightSiteKg: 600, defaultWeightKg: 500, volatileSolidsDefaultKgDmPerDay: 4,
      operationalDaysPerYear: 365, daysAliveInYear: 365, animalsProducedAnnually: 50
    }
  }]);
  const r = runExpression(calcExpression(), { documents: [asDocument(pd)] });
  const vsltPerAnimal = (600 / 500) * 4 * 365;
  const annualVs = 50 * vsltPerAnimal;
  assert.ok(Math.abs(r.volatileSolidsDerivation[0].volatileSolidsPerAnimalKgDm - vsltPerAnimal) < 1e-12);
  assert.ok(Math.abs(r.volatileSolidsDerivation[0].annualVolatileSolidsKgDm - annualVs) < 1e-9);
  assert.equal(r.volatileSolidsDerivation[0].source, 'vsltOption3_eq4_scaling');
  assert.ok(Math.abs(r.baselineMethaneEmissionsKgCh4 - annualVs * 0.5 * 0.2 * D_CH4_KG_PER_M3) < 1e-9);
});

test('legacy herdParameters alias still computes same Eq(4) scaling form', () => {
  const herd = { averageWeightSiteKg: 450, defaultWeightKg: 500, volatileSolidsDefaultKgDmPerDay: 3.5, operationalDaysPerYear: 300, daysAliveInYear: 365, animalsProducedAnnually: 1000 };
  const pd = base([{ type: 'Swine', maxMethaneProducingCapacity: 0.45, herdParameters: herd }]);
  const r = runExpression(calcExpression(), { documents: [asDocument(pd)] });
  const nlt = 365 * (1000 / 365);
  const vsltPerAnimal = (450 / 500) * 3.5 * 300;
  assert.equal(r.volatileSolidsDerivation[0].source, 'herdParameters');
  assert.ok(Math.abs(r.volatileSolidsDerivation[0].annualVolatileSolidsKgDm - nlt * vsltPerAnimal) < 1e-9);
});

test('Eq(4) scaling validates inputs', () => {
  const mk = (o) => base([{ type: 'C', maxMethaneProducingCapacity: 0.2, vsltAnnualAverageAnimals: 1, vsltOption3Eq4Scaling: { averageWeightSiteKg: 500, defaultWeightKg: 500, volatileSolidsDefaultKgDmPerDay: 4, operationalDaysPerYear: 365, daysAliveInYear: 365, animalsProducedAnnually: 1, ...o } }]);
  assert.throws(() => runExpression(calcExpression(), { documents: [asDocument(mk({ averageWeightSiteKg: 0 }))] }));
  assert.throws(() => runExpression(calcExpression(), { documents: [asDocument(mk({ defaultWeightKg: 0 }))] }));
  assert.throws(() => runExpression(calcExpression(), { documents: [asDocument(mk({ operationalDaysPerYear: 366 }))] }));
});
